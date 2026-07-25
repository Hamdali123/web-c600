import * as snmp from 'net-snmp';

export async function getOltStatus(ip: string, community: string, port: number = 161, version: 0 | 1 = 1): Promise<any> {
  const options: snmp.SessionOptions = {
      port: port,
      retries: 1,
      timeout: 5000,
      transport: "udp4",
      version: version,
      idBitsSize: 32
  };
  const session = snmp.createSession(ip, community, options);
  
  // Standard OIDs for most devices. Only sysUpTime to avoid GeneralError on some devices.
  const oids = [
    "1.3.6.1.2.1.1.3.0"       // sysUpTime
  ];
  
  return new Promise((resolve, reject) => {
    session.get(oids, (error: any, varbinds: any) => {
      session.close();
      if (error) {
        reject(error);
      } else {
        const result: any = {};
        for (let i = 0; i < varbinds.length; i++) {
          if (snmp.isVarbindError(varbinds[i])) {
             console.error(`SNMP Error for OID ${varbinds[i].oid}:`, snmp.varbindError(varbinds[i]));
          } else {
             // Handle Buffer to string conversions for certain data types if needed
             let val = varbinds[i].value;
             if (Buffer.isBuffer(val)) {
                 val = val.toString('utf8');
             }
             result[varbinds[i].oid] = val;
          }
        }
        resolve(result);
      }
    });
  });
}
