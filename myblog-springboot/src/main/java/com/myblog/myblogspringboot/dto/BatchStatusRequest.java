package com.myblog.myblogspringboot.dto;

import java.util.List;

/**
 * 批量更新文章状态请求体（对标 Express validateBatchStatus）。
 */
public class BatchStatusRequest {

    private List<Integer> ids;
    /** 只能是 draft 或 published */
    private String status;

    public List<Integer> getIds() { return ids; }
    public void setIds(List<Integer> ids) { this.ids = ids; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
