export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Jalankan autoDiscoveryWorker di sisi server saja
    await import('./lib/autoDiscoveryWorker');
    console.log("Background worker initialized.");
  }
}
