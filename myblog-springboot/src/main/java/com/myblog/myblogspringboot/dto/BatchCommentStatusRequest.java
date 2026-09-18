package com.myblog.myblogspringboot.dto;

import java.util.List;

/**
 * 批量更新评论状态请求体（对标 Express validateBatchCommentStatus）。
 */
public class BatchCommentStatusRequest {

    private List<Integer> ids;
    /** 只能是 pending / approved / deleted */
    private String status;

    public List<Integer> getIds() { return ids; }
    public void setIds(List<Integer> ids) { this.ids = ids; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
