

// commands
const ClockRate = clock => clock > 0
    ? "clock rate " + clock
    : "";

const Interface = (
        ifName,
        ospfInactive    = false,
    ) => ({
        plugin,
        bandwidth    = -1,
        clockrate    = -1,
        ospfPassive  = false,
        routesFn     = [],
    }) => network => (hostname, processId) => {

        const ifFullName = ifName + plugin

        const ipv4Cmd = `ip address ${network[hostname + "_ipv4"]} ${network.netmask}`;

        const ipv6Exist = network[hostname + "_ipv6"] !== undefined;
        const ipv6Cmd = ipv6Exist
            ? `ipv6 address ${network[hostname + "_ipv6"]}/${network.prefix_ipv6}`
            : "";

        const ospfIpv6Cmd =  ipv6Exist && !ospfPassive && !ospfInactive && processId !== -1
            ? `ipv6 ospf ${processId} area ${network.area}`
            : "";

        const bandwidthCmd = bandwidth >= 0
            ? "bandwidth " + bandwidth
            : "";

        const cmd_clockrate =  ClockRate(clockrate);

        const command = `
        interface ${ifFullName}
            ${ipv4Cmd}
            ${ipv6Cmd}
            no shutdown
            ${cmd_clockrate}
            ${bandwidthCmd}
            ${ospfIpv6Cmd}
            exit
        `;

        return {
            ifFullName,
            ipv4:   network[hostname + "_ipv4"] ,
            ipv6:   network[hostname + "_ipv6"],
            routeCmd: routesFn.map(fn => fn(ifFullName)).join("\n"),
            network,
            ospfInactive,
            ospfPassive,
            command,
        }
    };

export const InterfaceLoopback = Interface ("Loopback", true);
export const InterfaceFast     = Interface ("FastEthernet");
export const InterfaceGigabit  = Interface ("GigabitEthernet");
export const InterfaceVlan     = Interface ("vlan ") (1);
export const InterfaceSerial   = Interface ("Serial");