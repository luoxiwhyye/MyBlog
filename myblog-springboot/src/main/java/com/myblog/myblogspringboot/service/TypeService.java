package com.myblog.myblogspringboot.service;

import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Type;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.TypeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TypeService {

    private final TypeRepository typeRepository;

    public TypeService(TypeRepository typeRepository) {
        this.typeRepository = typeRepository;
    }

    public PageResponse<Map<String, Object>> getTypes(int page, int pageSize) {
        Page<Type> typePage = typeRepository.findAll(
                PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "id")));

        List<Map<String, Object>> list = typePage.getContent().stream().map(type -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", type.getId());
            map.put("typeName", type.getTypeName());
            map.put("articleCount", typeRepository.countArticlesByTypeId(type.getId()));
            return map;
        }).toList();

        return new PageResponse<>(list, typePage.getTotalElements(), page, pageSize);
    }

    @Transactional
    public Type createType(String typeName) {
        if (typeName == null || typeName.trim().isEmpty()) {
            throw new BusinessException(400, "分类名称不能为空");
        }

        Type type = new Type();
        type.setTypeName(typeName.trim());
        return typeRepository.save(type);
    }

    @Transactional
    public Type updateType(Integer id, String typeName) {
        if (typeName == null || typeName.trim().isEmpty()) {
            throw new BusinessException(400, "分类名称不能为空");
        }

        Type type = typeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "分类不存在"));
        type.setTypeName(typeName.trim());
        return typeRepository.save(type);
    }

    @Transactional
    public void deleteType(Integer id) {
        Type type = typeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "分类不存在"));

        if (typeRepository.countArticlesByTypeId(id) > 0) {
            throw new BusinessException(400, "分类下有文章，无法删除");
        }

        typeRepository.delete(type);
    }
}
