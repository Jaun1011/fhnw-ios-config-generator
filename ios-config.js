// commands
const ClockRate = clock => clock > 0 
    ? "clock rate " + clock 
    : "";

const Banner    = msg => `banner motd "${msg}"`;
const Password  = (configPw, enablePw, encypt = false) => `
        line console 0
            password ${configPw}
            login
            exit

        line vty 0 4
            password ${configPw}
            login
            transport input telnet
            exit

        enable password ${enablePw}
        enable secret   ${enablePw}
        ${encypt 
            ? "service password-encryption" 
            : ""
        }`;

// interfaces
const Interface = (
        interface,
        ospfInactive    = false,
    ) => ({
        plugin,
        bandwidth    = -1,
        clockrate    = -1,
        ospfPassive  = false,
        routesFn     = [],
    }) => network => (hostname, processId) => {

        const ifname = interface + plugin

        const ipv4Cmd = `ip address ${network[hostname + "_ipv4"]} ${network.netmask}`;
        const ipv6Cmd = network[hostname + "_ipv6"] != undefined
            ? `ipv6 address ${network[hostname + "_ipv6"]}/${network.prefix_ipv6}`
            : "";

        const ospfIpv6Cmd =  network[hostname + "_ipv6"] != undefined && !ospfPassive && !ospfInactive && processId != -1
            ? `ipv6 ospf ${processId} area ${network.area}`
            : "";

        const bandwidthCmd = bandwidth >= 0
            ? "bandwidth " + bandwidth
            : "";

        const cmd_clockrate =  ClockRate(clockrate);

        const command = `
        interface ${ifname}
            ${ipv4Cmd}
            ${ipv6Cmd}
            no shutdown
            ${cmd_clockrate}
            ${bandwidthCmd}
            ${ospfIpv6Cmd}
            exit
        `;
       
        return {
            ifname,
            ipv4:   network[hostname + "_ipv4"] ,
            ipv6:   network[hostname + "_ipv6"],
            routeCmd: routesFn.map(fn => fn(ifname)).join("\n"),
            network,
            ospfInactive,
            ospfPassive,
            command,
        }
    };

const InterfaceLoopback = Interface ("Loopback", ospfInactive = true);
const InterfaceFast     = Interface ("FastEthernet");
const InterfaceGigabit  = Interface ("GigabitEthernet");
const InterfaceVlan     = Interface ("vlan ") (1);
const InterfaceSerial   = Interface ("Serial");

const Switch = host => vlan => gateway =>`
    configure terminal
        hostname ${host}
       
        ${Password ("cisco", "class")}
        ${Banner   ("not autorized access not permitted")}

        ${InterfaceVlan (vlan)}
        ip default-gateway ${gateway}`;





const StaticRoute   = ({network, netmask})       => target => `ip route   ${network} ${netmask}  ${target}`;
const StaticRouteV6 = ({networkv6, prefix_ipv6}) => target => `ipv6 route ${networkv6}/${prefix_ipv6}  ${target}`;


const DefaultRoute   = StaticRoute   ({network: "0.0.0.0", netmask:"0.0.0.0"});
const DefaultRouteV6 = StaticRouteV6 ({networkv6: "::", prefix_ipv6: 64});

const OspfWildCard = netmask => netmask
        .split(".")
        .map(n => 255 - parseInt(n))
        .reduce((a, b) => a + "." + b);

const OspfNetwork  = net => `            
            network ${net.network} ${OspfWildCard(net.netmask)} area ${net.area}`;

const OspfPassive  = ifname => `
            passive-interface ${ifname}`;

const Ospf = processId => (routerId) => interfaces => {

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

const Router = (host, ipv6Enabled = true, ospfProcessId = 1, baseconfig = false) => (interfaces) => {
    
    const ifs        = interfaces.map(fn => fn(host, ospfProcessId));
    const ospfId     = ifs.map(i => i.ipv4).sort().reverse()[0];
    const cmd_routes = ifs.map(i => i.routeCmd).join("");
    const cmd_if     = ifs.map(i => i.command).join("\n");
    const cmd_ospf   = Ospf (ospfProcessId) (ospfId) (ifs);

    const cmd_base   = baseconfig
        ? `${Password ("cisco", "class")}
           ${Banner ("not autorized access not permitted")}`
        : ""


    return `
    # Router ${host}
    enable
    configure terminal
        no ip domain lookup
        hostname ${host}
        ${cmd_base}
        ${ipv6Enabled ? "ipv6 unicast-routing": ""}
        ${cmd_if}
        ${cmd_routes}
        ${cmd_ospf}
    `;
}


const testInterface = () => {
    // R1_ipv6: "1:2:3:4::1",
    // R2_ipv6: "1:2:3:4::2",
    // prefix_ipv6: 64, 

    const net_zh_ge = {
        network: "172.19.0.8",
        netmask: "255.255.255.252",
        area: 1,

        ZH_ipv4: "172.19.0.9",
        GE_ipv4: "172.19.0.10",
    }

    const net_zh_be = {
        network: "172.19.0.0",
        netmask: "255.255.255.252",
        area: 1,

        ZH_ipv4: "172.19.0.1",
        BE_ipv4: "172.19.0.2",
    }

    const net_ge_be = {
        network: "172.19.0.4",
        netmask: "255.255.255.252",
        area: 1,

        GE_ipv4: "172.19.0.5",
        BE_ipv4: "172.19.0.6",
    }

    const net_isp_ge = {
        network: "209.165.15.0",
        netmask: "255.255.255.252",
        area: 1,

        ISP_ipv4: "209.165.15.1",
        GE_ipv4:  "209.165.15.2",
    }


    const loopbacks = {
        netmask: "255.255.255.0",

        ZH_ipv4: "172.19.1.1",
        BE_ipv4: "172.19.2.1",
        GE_ipv4: "172.19.3.1",
    }

    const net_base = {
        netmask: "255.255.255.0",
        area: 1,
    }


    // InterfaceSerial (clock = 20000) ({plugin: 2, routesFn: [DefaultRoute,DefaultRouteV6] }) (netA),
       
    const r_zh = Router
            ("ZH")
            ([
                InterfaceFast     ({plugin: "0/0", bandwidth: 100, ospfInactive: true}) ({network: "172.19.4.0", ZH_ipv4: "172.19.4.1", ...net_base}),
                InterfaceFast     ({plugin: "0/1", bandwidth: 100}) ({network: "172.19.5.0", ZH_ipv4: "172.19.5.1", ...net_base}),
                InterfaceFast     ({plugin: "1/0", bandwidth: 100}) (net_zh_ge),
                InterfaceFast     ({plugin: "1/1", bandwidth: 100}) (net_zh_be),

                InterfaceLoopback ({plugin: "0"}) (loopbacks),
            ]);
    
    const r_be = Router
            ("BE")
            ([
                InterfaceGigabit   ({plugin: "0/0",   bandwidth: 1000}) (net_zh_be),
                InterfaceGigabit   ({plugin: "0/1",   bandwidth: 1000}) ({network: "172.19.6.0", BE_ipv4: "172.19.6.1", ...net_base}),
                
                InterfaceSerial    ({plugin: "0/0/1", bandwidth: 4000}) (net_ge_be),

                InterfaceLoopback  ({plugin: "0"}) (loopbacks),
            ]);

    
    const r_ge = Router
            ("GE")
            ([
                InterfaceSerial    ({plugin: "0/0/0", bandwidth: 4000, clockrate: 250000})  (net_ge_be),
                InterfaceSerial    ({
                    plugin: "0/0/1", 
                    bandwidth: 4000, 
                    ospfPassive: true, 
                    routesFn: [DefaultRoute]
                }) (net_isp_ge),

                InterfaceGigabit   ({plugin: "0/0",   bandwidth: 1000})  (net_zh_ge),
                InterfaceGigabit   ({plugin: "0/1",   bandwidth: 1000})  ({network: "172.19.7.0", GE_ipv4: "172.19.7.1", ...net_base}),

                InterfaceLoopback ({plugin: "0"}) (loopbacks),
            ]);


     const r_isp = Router
            ("ISP")
            ([
                InterfaceSerial    ({plugin: "0/2/0", bandwidth: 4000, clockrate: 250000})  (net_isp_ge),
                InterfaceGigabit   ({plugin: "0/1",   bandwidth: 1000, routesFn:[StaticRoute (net_isp_ge)]})  ({
                    network: "209.165.10.0", 
                    ISP_ipv4: "209.165.10.1", 
                    ...net_base
                }),
            ]);



    [
        r_zh,
        r_be,
        r_ge,
        r_isp
    ].forEach(m => console.log(m))

}

testInterface()