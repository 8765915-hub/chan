package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.BusReport;

/**
 * 上报记录Service接口
 * 
 * @author ruoyi
 */
public interface IBusReportService 
{
    /**
     * 查询上报记录
     * 
     * @param id 上报记录主键
     * @return 上报记录
     */
    public BusReport selectBusReportById(Long id);

    /**
     * 查询上报记录列表
     * 
     * @param busReport 上报记录
     * @return 上报记录集合
     */
    public List<BusReport> selectBusReportList(BusReport busReport);

    /**
     * 新增上报记录
     * 
     * @param busReport 上报记录
     * @return 结果
     */
    public int insertBusReport(BusReport busReport);

    /**
     * 修改上报记录
     * 
     * @param busReport 上报记录
     * @return 结果
     */
    public int updateBusReport(BusReport busReport);

    /**
     * 批量删除上报记录
     * 
     * @param ids 需要删除的上报记录主键集合
     * @return 结果
     */
    public int deleteBusReportByIds(Long[] ids);

    /**
     * 删除上报记录信息
     * 
     * @param id 上报记录主键
     * @return 结果
     */
    public int deleteBusReportById(Long id);
}
