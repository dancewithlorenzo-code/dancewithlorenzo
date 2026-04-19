import { Redirect } from 'expo-router';

// Immediately redirect to landing - let landing page handle auth routing
export default function Index() {
  return <Redirect href="/landing" />;
}
