package com.myblog.myblogspringboot.service;

import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Label;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.LabelRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LabelService {

    private final LabelRepository labelRepository;

    public LabelService(LabelRepository labelRepository) {
        this.labelRepository = labelRepository;
    }

    @Cacheable(value = "labels", key = "'list:' + #page + ':' + #pageSize", unless = "#result == null || #result.list.isEmpty()")
    public PageResponse<Map<String, Object>> getLabels(int page, int pageSize) {
        Page<Label> labelPage = labelRepository.findAll(
                PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "id")));

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
        if (labelName == null || labelName.trim().isEmpty()) {
            throw new BusinessException(400, "标签名称不能为空");
        }

        Label label = new Label();
        label.setLabelName(labelName.trim());
        return labelRepository.save(label);
    }

    @Transactional
    @CacheEvict(value = "labels", allEntries = true)
    public Label updateLabel(Integer id, String labelName) {
        if (labelName == null || labelName.trim().isEmpty()) {
            throw new BusinessException(400, "标签名称不能为空");
        }

        Label label = labelRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "标签不存在"));
        label.setLabelName(labelName.trim());
        return labelRepository.save(label);
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
