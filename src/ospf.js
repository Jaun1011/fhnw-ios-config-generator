

const OspfWildCard = netmask => netmask
        .split(".")
        .map(n => 255 - parseInt(n))
        .reduce((a, b) => a + "." + b);

const OspfNetwork  = net => `            
            network ${net.network} ${OspfWildCard(net.netmask)} area ${net.area}`;

const OspfPassive  = ifname => `
            passive-interface ${ifname}`;
    
export const Ospf = processId => (routerId) => interfaces => {

    const cmd_netwoks = interfaces
        .filter(i => !i.ospfPassive)
        .filter(i => !i.ospfInactive)
        .map(i => OspfNetwork(i.network))
        .join('');

    const cmd_passive = interfaces
        .filter(i => i.ospfPassive)
        .map(i => OspfPassive(i.ifname))
        .join('');

    const cmd_defaultRoute = interfaces.filter(i => i.routeCmd != "").length > 0
        ? "default-information originate"
        : "";


    return `
        router ospf ${processId}
            router-id ${routerId}
            ${cmd_netwoks}
            ${cmd_passive}
            ${cmd_defaultRoute}
            exit
    `;
}