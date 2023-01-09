import {InterfaceFast, InterfaceGigabit, InterfaceLoopback, InterfaceSerial} from "./interface.js";
import {Router} from "./device.js";
import {DefaultRoute, StaticRoute} from "./routing";

const testInterface = () => {

    // R1_ipv6: "1:2:3:4::1",
    // R2_ipv6: "1:2:3:4::2",
    // prefix_ipv6: 64,

    const net_zh_ge = {
        network: "172.19.0.8", netmask: "255.255.255.252", area: 1,
        ZH_ipv4: "172.19.0.9",
        GE_ipv4: "172.19.0.10",
    }

    const net_zh_be = {
        network: "172.19.0.0", netmask: "255.255.255.252", area: 1,
        ZH_ipv4: "172.19.0.1",
        BE_ipv4: "172.19.0.2",
    }

    const net_ge_be = {
        network: "172.19.0.4", netmask: "255.255.255.252", area: 1,
        GE_ipv4: "172.19.0.5",
        BE_ipv4: "172.19.0.6",
    }

    const net_isp_ge = {
        network: "209.165.15.0", netmask: "255.255.255.252", area: 1,
        ISP_ipv4: "209.165.15.1",
        GE_ipv4: "209.165.15.2",
    }


    const loopbacks = {
        netmask: "255.255.255.0",

        ZH_ipv4: "172.19.1.1",
        BE_ipv4: "172.19.2.1",
        GE_ipv4: "172.19.3.1",
    }

    const net_base = {netmask: "255.255.255.0", area: 1,}

    const r_zh = Router
        ("ZH")
        ([
            InterfaceFast ({plugin: "0/0", bandwidth: 100, ospfInactive: true})
                          ({network: "172.19.4.0", ZH_ipv4: "172.19.4.1", ...net_base}),

            InterfaceFast ({plugin: "0/1", bandwidth: 100, ospfPassive: true})
                          ({network: "172.19.5.0", ZH_ipv4: "172.19.5.1", ...net_base}),

            InterfaceFast ({plugin: "1/0", bandwidth: 100}) (net_zh_ge),
            InterfaceFast ({plugin: "1/1", bandwidth: 100}) (net_zh_be),

            InterfaceLoopback({plugin: "0"})(loopbacks),
        ]);

    const r_be = Router
        ("BE")
        ([
            InterfaceGigabit ({plugin: "0/0", bandwidth: 1000})(net_zh_be),
            InterfaceGigabit ({plugin: "0/1", bandwidth: 1000, ospfPassive: true})
                             ({network: "172.19.6.0", BE_ipv4: "172.19.6.1", ...net_base}),

            InterfaceSerial({plugin: "0/0/1", bandwidth: 4000})(net_ge_be),
            InterfaceLoopback({plugin: "0"})(loopbacks),
        ]);


    const r_ge = Router
        ("GE")
        ([
            InterfaceSerial ({plugin: "0/0/0", bandwidth: 4000, clockrate: 250000})(net_ge_be),
            InterfaceSerial ({plugin: "0/0/1",
                              bandwidth: 4000,
                              ospfPassive: true,
                              routesFn: [DefaultRoute]})
                             (net_isp_ge),

            InterfaceGigabit({plugin: "0/0", bandwidth: 1000})(net_zh_ge),
            InterfaceGigabit ({plugin: "0/1", bandwidth: 1000, ospfPassive: true})
                             ({network: "172.19.7.0", GE_ipv4: "172.19.7.1", ...net_base}),

            InterfaceLoopback({plugin: "0"})(loopbacks),
        ]);


    const r_isp = Router
        ("ISP")
        ([
            InterfaceSerial  ({plugin: "0/2/0", bandwidth: 4000, clockrate: 250000})(net_isp_ge),
            InterfaceGigabit ({plugin: "0/1", bandwidth: 1000, ospfPassive: true, routesFn: [StaticRoute(net_isp_ge)]})
                             ({network: "209.165.10.0", ISP_ipv4: "209.165.10.1", ...net_base        }),
        ]);


    [
        r_zh,
        r_be,
        r_ge,
        r_isp
    ].forEach(m => console.log(m))

}

testInterface()