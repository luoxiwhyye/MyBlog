/**
 * 公安联网备案号工具
 *
 * 与前台 `myblog-vue/myblog-blog/utils/policeIcp.ts` **同源** —— 前后台是两个独立工程、
 * 没有共享代码目录，所以这里是第二份实现。规则必须一致：从备案号文本里提取数字编码，
 * 拼出带 code 的查询地址；提取不到编码时退回查询首页。**改一处必须改另一处。**
 */

/** 公安部「全国互联网安全管理服务平台」备案查询页 */
export const POLICE_QUERY_URL = 'https://beian.mps.gov.cn/#/query/webSearch'

/**
 * 备案编码的下限长度。
 * 取 8 位是为了不把号码里的其它数字（如年份、序号）误当编码 —— 真实编码为 12~14 位。
 */
const CODE_PATTERN = /\d{8,}/

/** 由备案号文本得到公安部查询地址（带编码时直接定位到该条备案） */
export const buildPoliceIcpUrl = (raw?: string | null): string => {
  const code = raw?.match(CODE_PATTERN)?.[0]
  return code ? `${POLICE_QUERY_URL}?code=${code}` : POLICE_QUERY_URL
}
