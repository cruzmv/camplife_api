import noble, { Peripheral, Characteristic, Service } from 'noble';

export async function startScanning(): Promise<Peripheral[]> {
  return new Promise((resolve, reject) => {
    const discoveredDevices: Peripheral[] = [];

    noble.on('discover', (peripheral: Peripheral) => {
      console.log(`Found device: ${peripheral.advertisement.localName || 'Unknown'} (ID: ${peripheral.id})`);
      discoveredDevices.push(peripheral);
    });

    noble.on('stateChange', (state: string) => {
      if (state === 'poweredOn') {
        console.log('Starting Bluetooth scan...');
        noble.startScanning();
      } else {
        noble.stopScanning();
        reject(new Error('Bluetooth not powered on'));
      }
    });

    // Stop scanning after 5 seconds and resolve with discovered devices
    setTimeout(() => {
      noble.stopScanning();
      resolve(discoveredDevices);
    }, 5000);
  });
}
