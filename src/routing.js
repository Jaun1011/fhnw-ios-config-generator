
export const StaticRoute   = ({network, netmask})       => target => `ip route   ${network} ${netmask}  ${target}`;
export const StaticRouteV6 = ({networkv6, prefix_ipv6}) => target => `ipv6 route ${networkv6}/${prefix_ipv6}  ${target}`;

export const DefaultRoute   = StaticRoute   ({network: "0.0.0.0", netmask:"0.0.0.0"});
export const DefaultRouteV6 = StaticRouteV6 ({networkv6: "::", prefix_ipv6: 0});