package com.myblog.myblogspringboot.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Type;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.TypeRepository;

@Service
public class TypeService {

    /** 与 type.type_name 的 varchar(50) 对齐 */
    private static final int MAX_NAME_LENGTH = 50;

    private final TypeRepository typeRepository;

    public TypeService(TypeRepository typeRepository) {
        this.typeRepository = typeRepository;
    }

    @Cacheable(value = "types", key = "'list:' + #page + ':' + #pageSize", unless = "#result == null || #result.list.isEmpty()")
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
    @CacheEvict(value = "types", allEntries = true)
    public Type createType(String typeName) {
        String name = normalizeName(typeName);

        // 禁止重名（唯一索引外的第一层防护，报错更友好）
        if (typeRepository.existsByTypeName(name)) {
            throw new BusinessException(409, "分类「" + name + "」已存在");
        }

        Type type = new Type();
        type.setTypeName(name);
        // saveAndFlush：让 INSERT 在此处真正执行，便于捕获唯一索引冲突
        return saveCatchingDuplicate(type, name);
    }

    @Transactional
    @CacheEvict(value = "types", allEntries = true)
    public Type updateType(Integer id, String typeName) {
        String name = normalizeName(typeName);

        Type type = typeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "分类不存在"));

        // 改名时排除自身
        if (typeRepository.existsByTypeNameAndIdNot(name, id)) {
            throw new BusinessException(409, "分类「" + name + "」已存在");
        }

        type.setTypeName(name);
        return saveCatchingDuplicate(type, name);
    }

    /** 规整名称首尾空白并校验长度；返回 trim 后的名称 */
    private String normalizeName(String raw) {
        String name = raw == null ? "" : raw.trim();
        if (name.isEmpty()) {
            throw new BusinessException(400, "分类名称不能为空");
        }
        if (name.length() > MAX_NAME_LENGTH) {
            throw new BusinessException(400, "分类名称过长（≤" + MAX_NAME_LENGTH + " 字符）");
        }
        return name;
    }

    /** 并发下仍可能撞唯一索引，转成友好提示而非 500 */
    private Type saveCatchingDuplicate(Type type, String name) {
        try {
            return typeRepository.saveAndFlush(type);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException(409, "分类「" + name + "」已存在");
        }
    }

    @Transactional
    @CacheEvict(value = "types", allEntries = true)
    public void deleteType(Integer id) {
        Type type = typeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "分类不存在"));

        if (typeRepository.countArticlesByTypeId(id) > 0) {
            throw new BusinessException(400, "分类下有文章，无法删除");
        }

        typeRepository.delete(type);
    }
}
