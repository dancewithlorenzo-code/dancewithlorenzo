import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Convert array of objects to CSV string
function convertToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  // Create header row
  const csvRows = [headers.join(',')];

  // Create data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Download CSV for web
async function downloadCSVWeb(csvContent: string, filename: string): Promise<void> {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Save and share CSV for mobile
async function saveCsvMobile(csvContent: string, filename: string): Promise<void> {
  const fileUri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri);
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

// Main export function
export async function exportToCSV(data: any[], headers: string[], filename: string): Promise<{ success: boolean; error?: string }> {
  try {
    const csvContent = convertToCSV(data, headers);
    const fullFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    if (Platform.OS === 'web') {
      await downloadCSVWeb(csvContent, fullFilename);
    } else {
      await saveCsvMobile(csvContent, fullFilename);
    }

    return { success: true };
  } catch (error) {
    console.error('CSV export error:', error);
    return { success: false, error: error.message };
  }
}

// Export students data
export async function exportStudents(students: any[]): Promise<{ success: boolean; error?: string }> {
  const headers = ['id', 'email', 'username', 'is_admin', 'language', 'created_at'];
  const filename = `students_${new Date().toISOString().split('T')[0]}.csv`;
  return exportToCSV(students, headers, filename);
}

// Export boutique products
export async function exportBoutiqueProducts(products: any[]): Promise<{ success: boolean; error?: string }> {
  const processedProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    category: p.category,
    price: p.price / 100, // Convert from cents to yen
    stock_quantity: p.stock_quantity,
    sizes: p.sizes ? JSON.stringify(p.sizes) : '',
    is_active: p.is_active ? 'Active' : 'Inactive',
    image_url: p.image_url || '',
    created_at: p.created_at,
  }));

  const headers = ['id', 'name', 'description', 'category', 'price', 'stock_quantity', 'sizes', 'is_active', 'image_url', 'created_at'];
  const filename = `boutique_products_${new Date().toISOString().split('T')[0]}.csv`;
  return exportToCSV(processedProducts, headers, filename);
}

// Export music products
export async function exportMusicProducts(products: any[]): Promise<{ success: boolean; error?: string }> {
  const processedProducts = products.map(p => ({
    id: p.id,
    title: p.title,
    artist: p.artist,
    description: p.description || '',
    product_type: p.product_type,
    price: p.price / 100, // Convert from cents to yen
    track_count: p.track_count || '',
    release_date: p.release_date || '',
    is_active: p.is_active ? 'Active' : 'Inactive',
    cover_image_url: p.cover_image_url || '',
    preview_audio_url: p.preview_audio_url || '',
    created_at: p.created_at,
  }));

  const headers = ['id', 'title', 'artist', 'description', 'product_type', 'price', 'track_count', 'release_date', 'is_active', 'cover_image_url', 'preview_audio_url', 'created_at'];
  const filename = `music_products_${new Date().toISOString().split('T')[0]}.csv`;
  return exportToCSV(processedProducts, headers, filename);
}

// Export boutique orders
export async function exportBoutiqueOrders(orders: any[]): Promise<{ success: boolean; error?: string }> {
  const processedOrders = orders.map(o => ({
    order_id: o.id,
    customer_email: o.user_profiles?.email || '',
    customer_name: o.shipping_name,
    total_price: o.total_price / 100, // Convert from cents to yen
    status: o.status,
    payment_method: o.payment_intent_id ? 'Stripe' : 'Manual',
    shipping_address: o.shipping_address,
    tracking_number: o.tracking_number || '',
    notes: o.notes || '',
    created_at: o.created_at,
    updated_at: o.updated_at,
  }));

  const headers = ['order_id', 'customer_email', 'customer_name', 'total_price', 'status', 'payment_method', 'shipping_address', 'tracking_number', 'notes', 'created_at', 'updated_at'];
  const filename = `boutique_orders_${new Date().toISOString().split('T')[0]}.csv`;
  return exportToCSV(processedOrders, headers, filename);
}

// Export classes
export async function exportClasses(classes: any[]): Promise<{ success: boolean; error?: string }> {
  const processedClasses = classes.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description || '',
    class_type: c.class_type,
    class_category: c.class_category,
    location: c.location || '',
    start_time: c.start_time,
    end_time: c.end_time,
    max_participants: c.max_participants,
    current_participants: c.current_participants,
    fee_per_person: c.fee_per_person / 100, // Convert from cents to yen
    is_active: c.is_active ? 'Active' : 'Inactive',
    created_at: c.created_at,
  }));

  const headers = ['id', 'title', 'description', 'class_type', 'class_category', 'location', 'start_time', 'end_time', 'max_participants', 'current_participants', 'fee_per_person', 'is_active', 'created_at'];
  const filename = `classes_${new Date().toISOString().split('T')[0]}.csv`;
  return exportToCSV(processedClasses, headers, filename);
}

// Export workshop bundles (credit requests)
export async function exportCreditRequests(requests: any[]): Promise<{ success: boolean; error?: string }> {
  const processedRequests = requests.map(r => ({
    request_id: r.id,
    requester_email: r.requester?.email || '',
    recipient_email: r.recipient?.email || '',
    credits_requested: r.credits_requested,
    status: r.status,
    request_message: r.request_message || '',
    created_at: r.created_at,
    responded_at: r.responded_at || '',
    expires_at: r.expires_at || '',
  }));

  const headers = ['request_id', 'requester_email', 'recipient_email', 'credits_requested', 'status', 'request_message', 'created_at', 'responded_at', 'expires_at'];
  const filename = `credit_requests_${new Date().toISOString().split('T')[0]}.csv`;
  return exportToCSV(processedRequests, headers, filename);
}
