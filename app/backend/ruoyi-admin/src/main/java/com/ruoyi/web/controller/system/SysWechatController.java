package com.ruoyi.web.controller.system;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.framework.web.service.SysLoginService;
import com.ruoyi.common.constant.Constants;

/**
 * 微信登录控制器
 * 
 * @author ruoyi
 */
@RestController
public class SysWechatController
{
    @Autowired
    private SysLoginService loginService;

    /**
     * 微信小程序登录
     * 
     * @param loginBody 登录信息
     * @return 结果
     */
    @PostMapping("/wechat/login")
    public AjaxResult login(@RequestBody LoginBody loginBody)
    {
        AjaxResult ajax = AjaxResult.success();
        // 这里的 code 其实是前端传来的 wx.login 获取的 code
        // 实际业务中，需要调用微信接口换取 openid
        // 为了演示方便，这里我们暂时忽略 code 的校验，直接模拟生成 token
        // 您可以在 SysLoginService 中添加一个 wechatLogin 方法来实现真实的微信登录逻辑
        
        // 模拟登录：直接使用 admin 账号登录，跳过验证码校验
        // 注意：前端必须传递有效的 code (虽然我们这里暂时没用它换取 openid)
        String token = loginService.wechatLogin("admin", "admin123");
        ajax.put(Constants.TOKEN, token);
        return ajax;
    }
}
