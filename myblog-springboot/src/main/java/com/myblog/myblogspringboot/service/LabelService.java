package com.myblog.myblogspringboot.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Label;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.LabelRepository;

@Service
public class LabelService {

    /** 与 label.label_name 的 varchar(50) 对齐 */
    private static final int MAX_NAME_LENGTH = 50;

    private final LabelRepository labelRepository;

    public LabelService(LabelRepository labelRepository) {
        this.labelRepository = labelRepository;
    }

    /**
     * 获取标签列表（支持按名称关键词模糊检索）。
     * 缓存键需包含 keyword，否则不同搜索词会互相污染。
     */
    @Cacheable(value = "labels",
            key = "'list:' + #page + ':' + #pageSize + ':' + (#keyword == null ? '' : #keyword.trim())",
            unless = "#result == null || #result.list.isEmpty()")
    public PageResponse<Map<String, Object>> getLabels(int page, int pageSize, String keyword) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        String kw = keyword == null ? "" : keyword.trim();

        Page<Label> labelPage = kw.isEmpty()
                ? labelRepository.findAll(pageable)
                : labelRepository.findByLabelNameContainingIgnoreCase(kw, pageable);

        List<Map<String, Object>> list = labelPage.getContent().stream().map(label -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", label.getId());
            map.put("labelName", label.getLabelName());
            map.put("articleCount", labelRepository.countArticlesByLabelId(label.getId()));
            return map;
        }).toList();

        return new PageResponse<>(list, labelPage.getTotalElements(), page, pageSize);
    }

    @Transactional
    @CacheEvict(value = "labels", allEntries = true)
    public Label createLabel(String labelName) {
        String name = normalizeName(labelName);

        // 禁止重名（唯一索引外的第一层防护，报错更友好）
        if (labelRepository.existsByLabelName(name)) {
            throw new BusinessException(409, "标签「" + name + "」已存在");
        }

        Label label = new Label();
        label.setLabelName(name);
        // saveAndFlush：让 INSERT 在此处真正执行，便于捕获唯一索引冲突
        return saveCatchingDuplicate(label, name);
    }

    @Transactional
    @CacheEvict(value = "labels", allEntries = true)
    public Label updateLabel(Integer id, String labelName) {
        String name = normalizeName(labelName);

        Label label = labelRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "标签不存在"));

        // 改名时排除自身，否则「只改大小写之外的同名」会被误判为重名
        if (labelRepository.existsByLabelNameAndIdNot(name, id)) {
            throw new BusinessException(409, "标签「" + name + "」已存在");
        }

        label.setLabelName(name);
        return saveCatchingDuplicate(label, name);
    }

    /** 保留名称首尾空白并校验长度；返回 trim 后的名称 */
    private String normalizeName(String raw) {
        String name = raw == null ? "" : raw.trim();
        if (name.isEmpty()) {
            throw new BusinessException(400, "标签名称不能为空");
        }
        if (name.length() > MAX_NAME_LENGTH) {
            throw new BusinessException(400, "标签名称过长（≤" + MAX_NAME_LENGTH + " 字符）");
        }
        return name;
    }

    /** 并发下仍可能撞唯一索引，转成友好提示而非 500 */
    private Label saveCatchingDuplicate(Label label, String name) {
        try {
            return labelRepository.saveAndFlush(label);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException(409, "标签「" + name + "」已存在");
        }
    }

    @Transactional
    @CacheEvict(value = "labels", allEntries = true)
    public void deleteLabel(Integer id) {
        Label label = labelRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "标签不存在"));

        if (labelRepository.countLabelUsage(id) > 0) {
            throw new BusinessException(400, "标签被使用中，无法删除");
        }

        labelRepository.delete(label);
    }
}
