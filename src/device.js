
import { Ospf } from "./ospf.js";


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


export const Switch = host => vlan => gateway =>`
        configure terminal
            hostname ${host}
           
            ${Password ("cisco", "class")}
            ${Banner   ("not autorized access not permitted")}
    
            ${InterfaceVlan (vlan)}
            ip default-gateway ${gateway}`;


export const Router = (
    host,
    ipv6Enabled = false,
    ospfProcessId = 1,
    baseconfig = false
) => (interfaces) => {

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
