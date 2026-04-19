import { getSupabaseClient } from '@/template';

export interface SalesDataPoint {
  date: string;
  boutique_revenue: number;
  music_revenue: number;
  total_revenue: number;
  boutique_orders: number;
  music_orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: 'boutique' | 'music';
  total_sales: number;
  units_sold: number;
  revenue: number;
  image_url?: string;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
  percentage: number;
  order_count: number;
}

export interface StockAlert {
  id: string;
  product_name: string;
  current_stock: number;
  stock_status: 'critical' | 'low' | 'warning';
  recommended_reorder: number;
  image_url?: string;
}

export interface StockTurnover {
  product_id: string;
  product_name: string;
  total_sold: number;
  current_stock: number;
  turnover_rate: number; // units sold per month
  days_until_stockout: number;
  category: string;
  image_url?: string;
}

export interface ProductAnalytics {
  salesTrends: SalesDataPoint[];
  topProducts: TopProduct[];
  categoryRevenue: CategoryRevenue[];
  stockAlerts: StockAlert[];
  stockTurnover: StockTurnover[];
  summary: {
    total_revenue: number;
    total_orders: number;
    boutique_revenue: number;
    music_revenue: number;
    low_stock_items: number;
  };
}

const supabase = getSupabaseClient();

// Get sales trends over the last 30 days
export async function getSalesTrends(days: number = 30): Promise<SalesDataPoint[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get boutique orders
    const { data: boutiqueOrders } = await supabase
      .from('boutique_orders')
      .select('created_at, total_price, status')
      .gte('created_at', startDate.toISOString())
      .in('status', ['paid', 'shipped', 'delivered']);

    // Get music purchases
    const { data: musicPurchases } = await supabase
      .from('music_purchases')
      .select('created_at, purchase_price, payment_status')
      .gte('created_at', startDate.toISOString())
      .eq('payment_status', 'confirmed');

    // Aggregate by date
    const dataByDate = new Map<string, { boutique: number; music: number; boutiqueCount: number; musicCount: number }>();

    // Process boutique orders
    boutiqueOrders?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = dataByDate.get(date) || { boutique: 0, music: 0, boutiqueCount: 0, musicCount: 0 };
      existing.boutique += order.total_price;
      existing.boutiqueCount += 1;
      dataByDate.set(date, existing);
    });

    // Process music purchases
    musicPurchases?.forEach(purchase => {
      const date = new Date(purchase.created_at).toISOString().split('T')[0];
      const existing = dataByDate.get(date) || { boutique: 0, music: 0, boutiqueCount: 0, musicCount: 0 };
      existing.music += purchase.purchase_price;
      existing.musicCount += 1;
      dataByDate.set(date, existing);
    });

    // Convert to array and sort by date
    const salesData: SalesDataPoint[] = Array.from(dataByDate.entries()).map(([date, data]) => ({
      date,
      boutique_revenue: data.boutique,
      music_revenue: data.music,
      total_revenue: data.boutique + data.music,
      boutique_orders: data.boutiqueCount,
      music_orders: data.musicCount,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return salesData;
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    return [];
  }
}

// Get top-selling products
export async function getTopProducts(limit: number = 10): Promise<TopProduct[]> {
  try {
    const topProducts: TopProduct[] = [];

    // Get top boutique products
    const { data: boutiqueItems } = await supabase
      .from('boutique_order_items')
      .select(`
        product_id,
        product_name,
        quantity,
        price_at_purchase,
        boutique_products (image_url)
      `);

    // Aggregate boutique products
    const boutiqueMap = new Map<string, { name: string; units: number; revenue: number; imageUrl?: string }>();
    boutiqueItems?.forEach(item => {
      const existing = boutiqueMap.get(item.product_id) || { name: item.product_name, units: 0, revenue: 0 };
      existing.units += item.quantity;
      existing.revenue += item.price_at_purchase * item.quantity;
      existing.imageUrl = item.boutique_products?.image_url;
      boutiqueMap.set(item.product_id, existing);
    });

    // Convert to array
    boutiqueMap.forEach((data, productId) => {
      topProducts.push({
        id: productId,
        name: data.name,
        category: 'boutique',
        total_sales: data.units,
        units_sold: data.units,
        revenue: data.revenue,
        image_url: data.imageUrl,
      });
    });

    // Get top music products
    const { data: musicPurchases } = await supabase
      .from('music_purchases')
      .select(`
        product_id,
        purchase_price,
        payment_status,
        music_products (title, cover_image_url)
      `)
      .eq('payment_status', 'confirmed');

    // Aggregate music products
    const musicMap = new Map<string, { name: string; units: number; revenue: number; imageUrl?: string }>();
    musicPurchases?.forEach(purchase => {
      const existing = musicMap.get(purchase.product_id) || { 
        name: purchase.music_products?.title || 'Unknown',
        units: 0,
        revenue: 0
      };
      existing.units += 1;
      existing.revenue += purchase.purchase_price;
      existing.imageUrl = purchase.music_products?.cover_image_url;
      musicMap.set(purchase.product_id, existing);
    });

    // Convert to array
    musicMap.forEach((data, productId) => {
      topProducts.push({
        id: productId,
        name: data.name,
        category: 'music',
        total_sales: data.units,
        units_sold: data.units,
        revenue: data.revenue,
        image_url: data.imageUrl,
      });
    });

    // Sort by revenue and limit
    return topProducts.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  } catch (error) {
    console.error('Error fetching top products:', error);
    return [];
  }
}

// Get revenue breakdown by category
export async function getCategoryRevenue(): Promise<CategoryRevenue[]> {
  try {
    // Get boutique revenue
    const { data: boutiqueOrders } = await supabase
      .from('boutique_orders')
      .select('total_price, status')
      .in('status', ['paid', 'shipped', 'delivered']);

    const boutiqueRevenue = boutiqueOrders?.reduce((sum, order) => sum + order.total_price, 0) || 0;
    const boutiqueCount = boutiqueOrders?.length || 0;

    // Get music revenue
    const { data: musicPurchases } = await supabase
      .from('music_purchases')
      .select('purchase_price, payment_status')
      .eq('payment_status', 'confirmed');

    const musicRevenue = musicPurchases?.reduce((sum, purchase) => sum + purchase.purchase_price, 0) || 0;
    const musicCount = musicPurchases?.length || 0;

    const totalRevenue = boutiqueRevenue + musicRevenue;

    const categories: CategoryRevenue[] = [
      {
        category: 'Boutique',
        revenue: boutiqueRevenue,
        percentage: totalRevenue > 0 ? (boutiqueRevenue / totalRevenue) * 100 : 0,
        order_count: boutiqueCount,
      },
      {
        category: 'Music',
        revenue: musicRevenue,
        percentage: totalRevenue > 0 ? (musicRevenue / totalRevenue) * 100 : 0,
        order_count: musicCount,
      },
    ];

    return categories;
  } catch (error) {
    console.error('Error fetching category revenue:', error);
    return [];
  }
}

// Get stock alerts for low inventory
export async function getStockAlerts(): Promise<StockAlert[]> {
  try {
    const { data: products } = await supabase
      .from('boutique_products')
      .select('id, name, stock_quantity, image_url')
      .lte('stock_quantity', 20) // Alert threshold
      .order('stock_quantity', { ascending: true });

    const alerts: StockAlert[] = products?.map(product => {
      let status: 'critical' | 'low' | 'warning';
      let recommendedReorder: number;

      if (product.stock_quantity === 0) {
        status = 'critical';
        recommendedReorder = 20;
      } else if (product.stock_quantity <= 5) {
        status = 'critical';
        recommendedReorder = 15;
      } else if (product.stock_quantity <= 10) {
        status = 'low';
        recommendedReorder = 10;
      } else {
        status = 'warning';
        recommendedReorder = 5;
      }

      return {
        id: product.id,
        product_name: product.name,
        current_stock: product.stock_quantity,
        stock_status: status,
        recommended_reorder: recommendedReorder,
        image_url: product.image_url,
      };
    }) || [];

    return alerts;
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    return [];
  }
}

// Get stock turnover rates
export async function getStockTurnover(): Promise<StockTurnover[]> {
  try {
    // Get all boutique products
    const { data: products } = await supabase
      .from('boutique_products')
      .select('id, name, stock_quantity, category, image_url, created_at');

    if (!products) return [];

    // Get sales data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orderItems } = await supabase
      .from('boutique_order_items')
      .select('product_id, quantity, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Calculate turnover for each product
    const turnoverData: StockTurnover[] = products.map(product => {
      const productSales = orderItems?.filter(item => item.product_id === product.id) || [];
      const totalSold = productSales.reduce((sum, item) => sum + item.quantity, 0);
      const turnoverRate = totalSold; // units sold per 30 days
      const monthlyRate = turnoverRate / 30; // daily rate
      const daysUntilStockout = monthlyRate > 0 ? Math.floor(product.stock_quantity / monthlyRate) : 9999;

      return {
        product_id: product.id,
        product_name: product.name,
        total_sold: totalSold,
        current_stock: product.stock_quantity,
        turnover_rate: turnoverRate,
        days_until_stockout: daysUntilStockout,
        category: product.category,
        image_url: product.image_url,
      };
    });

    // Sort by days until stockout (most urgent first)
    return turnoverData.sort((a, b) => a.days_until_stockout - b.days_until_stockout);
  } catch (error) {
    console.error('Error calculating stock turnover:', error);
    return [];
  }
}

// Get complete product analytics
export async function getProductAnalytics(): Promise<ProductAnalytics> {
  try {
    const [salesTrends, topProducts, categoryRevenue, stockAlerts, stockTurnover] = await Promise.all([
      getSalesTrends(),
      getTopProducts(),
      getCategoryRevenue(),
      getStockAlerts(),
      getStockTurnover(),
    ]);

    const summary = {
      total_revenue: categoryRevenue.reduce((sum, cat) => sum + cat.revenue, 0),
      total_orders: categoryRevenue.reduce((sum, cat) => sum + cat.order_count, 0),
      boutique_revenue: categoryRevenue.find(c => c.category === 'Boutique')?.revenue || 0,
      music_revenue: categoryRevenue.find(c => c.category === 'Music')?.revenue || 0,
      low_stock_items: stockAlerts.length,
    };

    return {
      salesTrends,
      topProducts,
      categoryRevenue,
      stockAlerts,
      stockTurnover,
      summary,
    };
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    return {
      salesTrends: [],
      topProducts: [],
      categoryRevenue: [],
      stockAlerts: [],
      stockTurnover: [],
      summary: {
        total_revenue: 0,
        total_orders: 0,
        boutique_revenue: 0,
        music_revenue: 0,
        low_stock_items: 0,
      },
    };
  }
}
