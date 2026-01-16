-- 菜单 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('上报记录', '1', '1', 'report', 'system/report/index', 1, 0, 'C', '0', '0', 'system:report:list', 'form', 'admin', sysdate(), '', null, '上报记录菜单');

-- 按钮父菜单ID
SELECT @parentId := last_insert_id();

-- 按钮 SQL
insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('上报查询', @parentId, '1', '#', '', 1, 0, 'F', '0', '0', 'system:report:query', '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('上报新增', @parentId, '2', '#', '', 1, 0, 'F', '0', '0', 'system:report:add', '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('上报修改', @parentId, '3', '#', '', 1, 0, 'F', '0', '0', 'system:report:edit', '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('上报删除', @parentId, '4', '#', '', 1, 0, 'F', '0', '0', 'system:report:remove', '#', 'admin', sysdate(), '', null, '');

insert into sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
values('上报导出', @parentId, '5', '#', '', 1, 0, 'F', '0', '0', 'system:report:export', '#', 'admin', sysdate(), '', null, '');
