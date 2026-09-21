/**
 * 公安联网备案号工具
 *
 * 备案号在后台按原样填写（如「粤公网安备44030002000000号」），而公安部查询系统
 * 需要的是其中的纯数字编码（URL 的 code 参数）。这里负责从配置文本里提取编码并拼出
 * 查询地址；提取不到编码时退回查询首页 —— 链接始终可打开，只是需要访客自行检索。
 */

/** 公安部「全国互联网安全管理服务平台」备案查询页 */
export const POLICE_QUERY_URL = "https://beian.mps.gov.cn/#/query/webSearch";

/**
 * 备案编码的下限长度。
 * 取 8 位是为了不把号码里的其它数字（如年份、序号）误当编码 —— 真实编码为 12~14 位。
 */
const CODE_PATTERN = /\d{8,}/;

/** 由备案号文本得到公安部查询地址（带编码时直接定位到该条备案） */
export const buildPoliceIcpUrl = (raw?: string | null): string => {
  const code = raw?.match(CODE_PATTERN)?.[0];
  return code ? `${POLICE_QUERY_URL}?code=${code}` : POLICE_QUERY_URL;
};
