package com.ruoyi.system.service.impl;

import java.util.List;
import com.ruoyi.common.utils.DateUtils;
import com.ruoyi.common.utils.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.mapper.BusReportMapper;
import com.ruoyi.system.mapper.SysUserMapper;
import com.ruoyi.system.domain.BusReport;
import com.ruoyi.system.service.IBusReportService;
import com.ruoyi.common.core.domain.entity.SysUser;

/**
 * 上报记录Service业务层处理
 * 
 * @author ruoyi
 */
@Service
public class BusReportServiceImpl implements IBusReportService 
{
    @Autowired
    private BusReportMapper busReportMapper;

    @Autowired
    private SysUserMapper userMapper;

    /**
     * 查询上报记录
     * 
     * @param id 上报记录主键
     * @return 上报记录
     */
    @Override
    public BusReport selectBusReportById(Long id)
    {
        return busReportMapper.selectBusReportById(id);
    }

    /**
     * 查询上报记录列表
     * 
     * @param busReport 上报记录
     * @return 上报记录
     */
    @Override
    public List<BusReport> selectBusReportList(BusReport busReport)
    {
        return busReportMapper.selectBusReportList(busReport);
    }

    /**
     * 新增上报记录
     * 
     * @param busReport 上报记录
     * @return 结果
     */
    @Override
    public int insertBusReport(BusReport busReport)
    {
        busReport.setCreateTime(DateUtils.getNowDate());
        int rows = busReportMapper.insertBusReport(busReport);
        
        // 增加积分逻辑：上报成功 +10 积分
        if (rows > 0) {
            try {
                Long userId = SecurityUtils.getUserId();
                SysUser user = userMapper.selectUserById(userId);
                if (user != null) {
                    Long currentPoints = user.getPoints() == null ? 0L : user.getPoints();
                    user.setPoints(currentPoints + 10);
                    userMapper.updateUser(user);
                }
            } catch (Exception e) {
                // 记录日志或忽略，不影响上报主流程
                e.printStackTrace();
            }
        }
        
        return rows;
    }

    /**
     * 修改上报记录
     * 
     * @param busReport 上报记录
     * @return 结果
     */
    @Override
    public int updateBusReport(BusReport busReport)
    {
        busReport.setUpdateTime(DateUtils.getNowDate());
        return busReportMapper.updateBusReport(busReport);
    }

    /**
     * 批量删除上报记录
     * 
     * @param ids 需要删除的上报记录主键
     * @return 结果
     */
    @Override
    public int deleteBusReportByIds(Long[] ids)
    {
        return busReportMapper.deleteBusReportByIds(ids);
    }

    /**
     * 删除上报记录信息
     * 
     * @param id 上报记录主键
     * @return 结果
     */
    @Override
    public int deleteBusReportById(Long id)
    {
        return busReportMapper.deleteBusReportById(id);
    }
}
