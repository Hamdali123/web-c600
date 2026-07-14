export function authorizeOnuCommand(params: {
    portInfo: string;
    onuId: string;
    sn: string;
    name: string;
    vlan: number;
    mode: 'bridge' | 'route';
}) {
    const portParts = params.portInfo.split('_'); // e.g. gpon-olt_0/1/1
    const frameSlotPort = portParts[1]; 
    return `
config
interface ${params.portInfo}
  ont add ${frameSlotPort} ${params.onuId} sn-auth ${params.sn} omci ont-lineprofile-id 1 ont-srvprofile-id 1 desc "${params.name}"
  ont port native-vlan ${frameSlotPort} ${params.onuId} eth 1 vlan ${params.vlan}
quit
service-port vlan ${params.vlan} gpon ${frameSlotPort} ont ${params.onuId} gemport 1 multi-service user-vlan ${params.vlan}
`;
}

export function rebootOnuCommand(portInfo: string, onuId: string) {
    const portParts = portInfo.split('_');
    const frameSlotPort = portParts[1];
    return `
config
interface ${portInfo}
  ont reset ${frameSlotPort} ${onuId}
quit
`;
}

export function deleteOnuCommand(portInfo: string, onuId: string) {
    const portParts = portInfo.split('_');
    const frameSlotPort = portParts[1];
    return `
config
interface ${portInfo}
  ont delete ${frameSlotPort} ${onuId}
quit
`;
}

export function enableOnuCommand(portInfo: string, onuId: string) {
    const portParts = portInfo.split('_');
    const frameSlotPort = portParts[1];
    return `
config
interface ${portInfo}
  ont activate ${frameSlotPort} ${onuId}
quit
`;
}

export function disableOnuCommand(portInfo: string, onuId: string) {
    const portParts = portInfo.split('_');
    const frameSlotPort = portParts[1];
    return `
config
interface ${portInfo}
  ont deactivate ${frameSlotPort} ${onuId}
quit
`;
}

export function getRunningConfigCommand(portInfo: string, onuId: string) {
    const portParts = portInfo.split('_');
    const frameSlotPort = portParts[1];
    return `display current-configuration ont ${frameSlotPort} ${onuId}`;
}

export function getMetricsCommand() {
    return `display board 0/0`;
}

export function getSaveCommand() {
    return `save`;
}

export function parseMetrics(output: string) {
    let cpu = 0, mem = 0, temp = 0;
    const cpuMatch = output.match(/CPU usage.*?(\d+)/i);
    const memMatch = output.match(/Memory usage.*?(\d+)/i);
    const tempMatch = output.match(/Temperature.*?(\d+)/i);
    if (cpuMatch) cpu = parseInt(cpuMatch[1]);
    if (memMatch) mem = parseInt(memMatch[1]);
    if (tempMatch) temp = parseInt(tempMatch[1]);
    return { cpu, mem, temp };
}
