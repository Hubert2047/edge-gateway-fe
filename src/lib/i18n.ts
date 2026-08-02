'use client'

import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { getStoredSettings, saveSettings } from '@/lib/settings'

export type Locale = 'zh-TW' | 'en'

export function isLocale(value: unknown): value is Locale {
    return value === 'zh-TW' || value === 'en'
}

type MessageTree = { [key: string]: string | MessageTree }

const zhTW: MessageTree = {
    nav: {
        overview: '總覽',
        cloudSync: '雲端同步',
        gateways: '本地閘道',
        meters: '智慧勾表',
        historyData: '歷史資料',
        historyEvents: '歷史事件',
        processControl: '製程管制',
        processRules: '製程規則',
        users: '使用者管理',
        settings: '系統設定',
        apiDocs: 'API 文件',
        logout: '登出',
        edgeService: 'Edge service',
        connected: '連線正常',
        disconnected: "連線中斷",
        openMenu: '開啟選單',
        closeMenu: '關閉選單',

    },

    common: {
        enabled: '啟用',
        disabled: '停用',
        save: '儲存',
        delete: '刪除',
        cancel: '取消',
        confirm: '確認',
        add: '新增',
        adding: '新增中...',
        saving: '儲存中...',
        info: '資訊',
        status: '狀態',
        actions: '操作',
        name: '名稱',
        displayName: '顯示名稱',
        gateway: '閘道器',
        settings: '細部設定',
        ip: 'IP 位址',
        port: 'PORT',
        seconds: '秒',
        interval: '採集頻率（秒）',
        id: 'ID',
        collectNow: '立即收集',
        confirmSave: '確認儲存',
        confirmDelete: '確認刪除',
        confirmCollect: '確認收集',
        confirmSaveDescription: '確定要儲存「{name}」的設定嗎？',
        confirmDeleteDescription: '確定要刪除「{name}」嗎？此操作無法復原。',
        confirmCollectDescription: '確定要立即對「{name}」執行收集嗎？',
    },

    page: {
        gateways: '本地閘道',
        cloudSync: '雲端同步',
        meters: '智慧勾表',
        noGateways: '尚未設定任何本地閘道，請先至「本地閘道」新增閘道。',
    },

    empty: {
        noGateways: '尚未設定任何本地閘道',
        noCloudTargets: '尚未設定任何雲端服務器',
    },

    gateway: {
        add: '新增閘道器',
        virtual: '虛擬閘道器',
        virtualBadge: '虛擬',
        virtualDescription: '彙整所有本地閘道器的智慧勾表',
        virtualSaved: '虛擬閘道器設定已儲存',
        virtualCollectUnavailable: '後端尚未提供虛擬閘道器的立即收集功能',
        monitoring: '監控中',
        meterCount: '{count} 智慧勾表數',
        lastSuccess: '最近成功：',
        idPlaceholder: '例如：GW001',
        namePlaceholder: '例如：一樓機房',
        ipPlaceholder: '192.168.1.100',
        portPlaceholder: '10123',
        intervalPlaceholder: '60',
        optional: '選填',
        unableToReach: '無法連線到閘道器',
    },

    cloud: {
        runQueue: '執行佇列上傳',
        running: '執行中...',
        online: '在線',
        server: '雲端服務器',
        secret: '雲端服務器密鑰',
        apiBaseUrl: 'API BASE URL',
        uploadInterval: '上傳頻率（秒）',
        lastUpload: '上次正確上傳時間',
        pending: '待續傳',
        notUploaded: '尚未上傳',
        testConnection: '測試連線',
        success: '連線成功',
        failure: '連線失敗',
        id: '雲端服務器 ID',
        namePlaceholder: '例如：MMold 雲端（展示工廠A）',
        urlPlaceholder: 'https://api.mmold.com',
        add: '新增雲端服務器',

    },

    meter: {
        add: '新增智慧勾表',
        count: '{count} 個',
        phase: '相位型態',
        singlePhase: '單相',
        threePhase: '三相',
        voltage: '設定電壓 (V)',
        powerFactor: '功率因數',
        namePlaceholder: '例如：主進線',
        macPlaceholder: '例如：AA:BB:CC:DD:EE:FF',
        unsaved: '{count} 筆尚未儲存',
        allSaved: '所有變更已儲存',
        saveAll: '儲存全部 ({count})',
        tableName: '智慧勾表名稱',
        macId: 'MAC ID',
        status: '狀態',
        added: '新增成功',
        saved: '已儲存 {count} 筆',
        partialSaved: '成功 {success} 筆，失敗 {failure} 筆',
        confirmSaveAll: '確認全部儲存',
        confirmSaveAllDescription: '確定要儲存{name}嗎？',
    },

    login: {
        title: '登入帳號',
        subtitle: '請輸入您的帳號密碼以繼續',
        username: '帳號',
        password: '密碼',
        usernamePlaceholder: '輸入帳號',
        login: '登入',
        loggingIn: '登入中...',
        usernameRequired: '請輸入帳號',
        passwordRequired: '請輸入密碼',
        invalidCredentials: '帳號或密碼錯誤',
        errorGeneric: '登入失敗，請稍後再試',
    },

    validation: {
        nameRequired: '請輸入名稱',
        displayNameRequired: '請輸入顯示名稱',
        ipRequired: '請輸入 IP',
        portInvalid: '請輸入有效的 PORT',
        intervalInvalid: '請輸入有效的秒數',
        idRequired: '請輸入 ID',
        voltageInvalid: '請輸入有效的電壓',
        powerFactorInvalid: '請輸入 0 ~ 1 之間的功率因數',
        macRequired: '請輸入 MAC ID',
        urlRequired: '請輸入 API BASE URL',
        cloudIdRequired: '請輸入雲端服務器 ID',
        secretRequired: '請輸入雲端服務器密鑰',
    },

    toast: {
        saveFailed: '儲存失敗',
        deleteFailed: '刪除失敗',
        collectFailed: '收集失敗',
        addFailed: '新增失敗',
        statusFailed: '更新狀態失敗',
        added: '新增成功',
        connectionFailed: '連線失敗',
    },

    time: {
        justNow: '剛剛',
        secondsAgo: '{count} 秒前',
        minutesAgo: '{count} 分鐘前',
        hoursAgo: '{count} 小時前',
        daysAgo: '{count} 天前',
    },

    settings: {
        title: '系統設定',
        languageTitle: '語言',
        languageLabel: '介面語言',
        timeZoneLabel: '國家／地區時間',
        currentTime: '目前時間',
        zhTW: '繁體中文',
        en: 'English',
        save: '儲存設定',
        saved: '語言設定已儲存',
        timeZoneSaved: '國家／地區時間設定已儲存',
    },

    overview: {
        title: '營運總覽',
        refresh: '重新整理',
        gatewayOnline: '閘道器在線',
        cloudOnline: '雲端在線',
        meterCount: '智慧勾表',
        uploaded: '成功投遞',
        pending: '等待上傳',
        gatewayStatus: '閘道器狀態',
        cloudStatus: '雲端狀態',
        meterStatus: '智慧勾表實時狀態',
        meters: '個智慧勾表',
        monitoring: '監控中',
        online: '在線',
        voltage: '電壓',
        averageCurrent: '平均電流',
        latestDataUnavailable: '最新資料：尚未提供即時讀值 API',
        noGateways: '尚未設定任何本地閘道',
        noCloudTargets: '尚未設定任何雲端服務器',
        noMeters: '尚未設定任何智慧勾表',
    },

    processControl: {
        title: '製程管制分析',
        normal: '製程正常',
        timeRange: '時間軸',
        daily: '每天（0:00–24:00）',
        weekly: '每週',
        monthly: '每月',
        date: '指定時間',
        gateway: '閘道器',
        meter: '智慧勾表',
        metric: '分析指標',
        activePower: '有效功率',
        current: '電流',
        selectGateway: '請選擇閘道器',
        selectMeter: '請選擇智慧勾表',
        lowerLimit: '管制下限',
        upperLimit: '管制上限',
        query: '查詢',
        latest: '最新值',
        average: '平均值',
        minimum: '最小值',
        maximum: '最大值',
        exceeded: '超出管制',
        sampleCount: '樣本數',
        dataUnavailable: '尚未提供製程歷史資料 API',
    },

    historyData: {
        title: '歷史數據',
        records: '筆記錄',
        timeRange: '時間軸',
        hourly: '每時（00–60 分）',
        daily: '每天',
        weekly: '每週',
        date: '指定時間',
        gateway: '閘道器',
        meter: '智慧勾表',
        metric: '分析指標',
        averageCurrent: '平均電流',
        selectGateway: '請選擇閘道器',
        selectMeter: '請選擇智慧勾表',
        showThreePhase: '顯示三相電流',
        query: '查詢',
        samples: '樣本數',
        dataUnavailable: '尚未提供歷史資料 API',
        noData: '查無歷史資料',
        time: '時間',
        voltage: '電壓',
        activePower: '有效功率',
        status: '狀態',
    },

    historyEvents: {
        title: '歷史事件',
        records: '筆事件',
        timeRange: '時間軸',
        daily: '每天（0:00–24:00）',
        weekly: '每週',
        monthly: '每月',
        date: '指定時間',
        gateway: '閘道器',
        meter: '智慧勾表',
        rule: '製程規則',
        allGateways: '全部閘道器',
        allMeters: '全部智慧勾表',
        allRules: '全部製程規則',
        query: '查詢',
        noData: '查無歷史事件',
        time: '時間',
        ruleName: '規則名稱',
        metric: '分析指標',
        triggerValue: '觸發值',
        threshold: '閾值',
        reason: '觸發原因',
    },

    processRules: {
        title: '製程規則',
        rules: '條規則',
        status: '狀態',
        ruleName: '規則名稱',
        gatewayMetric: '閘道器／分析指標',
        meterThreshold: '智慧勾表／閾值',
        noRules: '尚未建立任何製程規則',
        gateway: '閘道器',
        metric: '分析指標',
        meter: '智慧勾表',
        lower: '下限閾值',
        upper: '上限閾值',
        activePower: '有效功率',
        allMeters: '全部智慧勾表',
        selectGateway: '請選擇閘道器',
        addTitle: '新增製程規則',
    },

    users: {
        title: '使用者管理',
        count: '位使用者',
        username: '使用者名稱',
        password: '密碼',
        role: '角色',
        status: '狀態',
        admin: '管理員',
        user: '使用者',
        viewer: '檢視者',
        readonly: '唯讀',
        empty: '尚未建立任何使用者',
        addTitle: '新增使用者',
        required: '請輸入使用者名稱與密碼',
        created: '使用者建立成功',
        createFailed: '使用者建立失敗',
        updateFailed: '使用者更新失敗',
        updated: '使用者資料更新成功',
        deleted: '使用者刪除成功',
        deleteFailed: '使用者刪除失敗',
        resetPassword: '重設密碼',
        resetPasswordDescription: '請輸入「{username}」的新密碼。',
        newPassword: '新密碼',
        passwordRequired: '請輸入新密碼',
        passwordReset: '密碼重設成功',
        passwordResetFailed: '密碼重設失敗',
        usernameUpdated: '使用者名稱更新成功',
        protected: '系統管理員',
        confirmDeleteTitle: "刪除使用者",
        confirmDelete: "確定要刪除使用者「{username}」嗎？此操作無法復原。"
    },
}

const en: MessageTree = {
    nav: {
        overview: 'Overview',
        cloudSync: 'Cloud Sync',
        gateways: 'Local Gateways',
        meters: 'Smart Meters',
        historyData: 'Historical Data',
        historyEvents: 'Historical Events',
        processControl: 'Process Control',
        processRules: 'Process Rules',
        users: 'User management',
        settings: 'Settings',
        apiDocs: 'API Docs',
        logout: 'Log out',
        edgeService: 'Edge service',
        connected: 'Connected',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
        disconnected: "Disconnected",
    },

    common: {
        enabled: 'Enabled',
        disabled: 'Disabled',
        save: 'Save',
        delete: 'Delete',
        cancel: 'Cancel',
        confirm: 'Confirm',
        add: 'Add',
        adding: 'Adding...',
        saving: 'Saving...',
        info: 'Info',
        status: 'Status',
        actions: 'Actions',
        name: 'Name',
        displayName: 'Display name',
        gateway: 'Gateway',
        settings: 'Details',
        ip: 'IP address',
        port: 'PORT',
        seconds: 'sec',
        interval: 'Polling interval (sec)',
        id: 'ID',
        collectNow: 'Collect now',
        confirmSave: 'Confirm save',
        confirmDelete: 'Confirm deletion',
        confirmCollect: 'Confirm collection',
        confirmSaveDescription: 'Save the settings for “{name}”?',
        confirmDeleteDescription: 'Delete “{name}”? This action cannot be undone.',
        confirmCollectDescription: 'Collect data from “{name}” now?',
    },

    page: {
        gateways: 'Local Gateways',
        cloudSync: 'Cloud Sync',
        meters: 'Smart Meters',
        noGateways: 'No local gateways configured. Add one from “Local Gateways” first.',
    },

    empty: {
        noGateways: 'No local gateways configured',
        noCloudTargets: 'No cloud targets configured',
    },

    gateway: {
        add: 'Add gateway',
        virtual: 'Virtual gateway',
        virtualBadge: 'Virtual',
        virtualDescription: 'Aggregates smart meters from all local gateways',
        virtualSaved: 'Virtual gateway settings saved',
        virtualCollectUnavailable: 'The backend does not support collecting from the virtual gateway yet',
        monitoring: 'Monitoring',
        meterCount: '{count} smart meters',
        lastSuccess: 'Last success:',
        idPlaceholder: 'e.g. GW001',
        namePlaceholder: 'e.g. First-floor room',
        ipPlaceholder: '192.168.1.100',
        portPlaceholder: '10123',
        intervalPlaceholder: '60',
        optional: 'Optional',
        unableToReach: 'Unable to reach gateway',
    },

    cloud: {
        runQueue: 'Run queued uploads',
        running: 'Running...',
        online: 'Online',
        server: 'Cloud server',
        secret: 'Cloud server secret',
        apiBaseUrl: 'API BASE URL',
        uploadInterval: 'Upload interval (sec)',
        lastUpload: 'Last successful upload',
        pending: 'Pending uploads',
        notUploaded: 'Not uploaded yet',
        testConnection: 'Test connection',
        success: 'Connection successful',
        failure: 'Connection failed',
        id: 'Cloud server ID',
        namePlaceholder: 'e.g. MMold Cloud (Factory A)',
        urlPlaceholder: 'https://api.mmold.com',
        add: 'Add cloud server',

    },

    meter: {
        add: 'Add smart meter',
        count: '{count}',
        phase: 'Phase type',
        singlePhase: 'Single-phase',
        threePhase: 'Three-phase',
        voltage: 'Voltage (V)',
        powerFactor: 'Power factor',
        namePlaceholder: 'e.g. Main feed',
        macPlaceholder: 'e.g. AA:BB:CC:DD:EE:FF',
        unsaved: '{count} unsaved',
        allSaved: 'All changes saved',
        saveAll: 'Save all ({count})',
        tableName: 'Smart meter name',
        macId: 'MAC ID',
        status: 'Status',
        added: 'Added successfully',
        saved: 'Saved {count}',
        partialSaved: 'Succeeded: {success}, failed: {failure}',
        confirmSaveAll: 'Confirm save all',
        confirmSaveAllDescription: 'Save {name}?',
    },

    login: {
        title: 'Sign in',
        subtitle: 'Enter your username and password to continue',
        username: 'Username',
        password: 'Password',
        usernamePlaceholder: 'Enter username',
        login: 'Sign in',
        loggingIn: 'Signing in...',
        usernameRequired: 'Please enter your username',
        passwordRequired: 'Please enter your password',
        invalidCredentials: 'Invalid username or password',
        errorGeneric: 'Login failed. Please try again.',
    },

    validation: {
        nameRequired: 'Please enter a name',
        displayNameRequired: 'Please enter a display name',
        ipRequired: 'Please enter an IP address',
        portInvalid: 'Please enter a valid port',
        intervalInvalid: 'Please enter a valid number of seconds',
        idRequired: 'Please enter an ID',
        voltageInvalid: 'Please enter a valid voltage',
        powerFactorInvalid: 'Enter a power factor between 0 and 1',
        macRequired: 'Please enter a MAC ID',
        urlRequired: 'Please enter an API base URL',
        cloudIdRequired: 'Please enter a cloud server ID',
        secretRequired: 'Please enter a cloud server secret',
    },

    toast: {
        saveFailed: 'Save failed',
        deleteFailed: 'Delete failed',
        collectFailed: 'Collection failed',
        addFailed: 'Add failed',
        statusFailed: 'Failed to update status',
        added: 'Added successfully',
        connectionFailed: 'Connection failed',
    },

    time: {
        justNow: 'Just now',
        secondsAgo: '{count}s ago',
        minutesAgo: '{count}m ago',
        hoursAgo: '{count}h ago',
        daysAgo: '{count}d ago',
    },

    settings: {
        title: 'Settings',
        languageTitle: 'Language',
        languageLabel: 'Interface language',
        timeZoneLabel: 'Country / region time',
        currentTime: 'Current time',
        zhTW: '繁體中文',
        en: 'English',
        save: 'Save settings',
        saved: 'Language preference saved',
        timeZoneSaved: 'Country / region time saved',
    },

    overview: {
        title: 'Operations overview',
        refresh: 'Refresh',
        gatewayOnline: 'Gateways online',
        cloudOnline: 'Cloud targets online',
        meterCount: 'Smart meters',
        uploaded: 'Successful uploads',
        pending: 'Pending uploads',
        gatewayStatus: 'Gateway status',
        cloudStatus: 'Cloud status',
        meterStatus: 'Smart meter live status',
        meters: 'smart meters',
        monitoring: 'Monitoring',
        online: 'Online',
        voltage: 'Voltage',
        averageCurrent: 'Average current',
        latestDataUnavailable: 'Latest data: real-time readings API is not available yet',
        noGateways: 'No local gateways configured',
        noCloudTargets: 'No cloud targets configured',
        noMeters: 'No smart meters configured',
    },

    processControl: {
        title: 'Process control analysis',
        normal: 'Process normal',
        timeRange: 'Time range',
        daily: 'Daily (0:00–24:00)',
        weekly: 'Weekly',
        monthly: 'Monthly',
        date: 'Date',
        gateway: 'Gateway',
        meter: 'Smart meter',
        metric: 'Metric',
        activePower: 'Active power',
        current: 'Current',
        selectGateway: 'Select gateway',
        selectMeter: 'Select smart meter',
        lowerLimit: 'Lower limit',
        upperLimit: 'Upper limit',
        query: 'Query',
        latest: 'Latest',
        average: 'Average',
        minimum: 'Minimum',
        maximum: 'Maximum',
        exceeded: 'Exceeded control',
        sampleCount: 'Samples',
        dataUnavailable: 'Process history API is not available yet',
    },

    historyData: {
        title: 'Historical data',
        records: 'records',
        timeRange: 'Time range',
        hourly: 'Hourly (00–60 min)',
        daily: 'Daily',
        weekly: 'Weekly',
        date: 'Date',
        gateway: 'Gateway',
        meter: 'Smart meter',
        metric: 'Metric',
        averageCurrent: 'Average current',
        selectGateway: 'Select gateway',
        selectMeter: 'Select smart meter',
        showThreePhase: 'Show three-phase current',
        query: 'Query',
        samples: 'samples',
        dataUnavailable: 'Historical data API is not available yet',
        noData: 'No historical data',
        time: 'Time',
        voltage: 'Voltage',
        activePower: 'Active power',
        status: 'Status',
    },

    historyEvents: {
        title: 'Historical events',
        records: 'events',
        timeRange: 'Time range',
        daily: 'Daily (0:00–24:00)',
        weekly: 'Weekly',
        monthly: 'Monthly',
        date: 'Date',
        gateway: 'Gateway',
        meter: 'Smart meter',
        rule: 'Process rule',
        allGateways: 'All gateways',
        allMeters: 'All smart meters',
        allRules: 'All process rules',
        query: 'Query',
        noData: 'No historical events',
        time: 'Time',
        ruleName: 'Rule name',
        metric: 'Metric',
        triggerValue: 'Trigger value',
        threshold: 'Threshold',
        reason: 'Trigger reason',
    },

    processRules: {
        title: 'Process rules',
        rules: 'rules',
        status: 'Status',
        ruleName: 'Rule name',
        gatewayMetric: 'Gateway / metric',
        meterThreshold: 'Smart meter / threshold',
        noRules: 'No process rules configured',
        gateway: 'Gateway',
        metric: 'Metric',
        meter: 'Smart meter',
        lower: 'Lower limit',
        upper: 'Upper limit',
        activePower: 'Active power',
        allMeters: 'All smart meters',
        selectGateway: 'Select gateway',
        addTitle: 'Add process rule',

    },

    users: {
        title: 'User management',
        count: 'users',
        username: 'Username',
        password: 'Password',
        role: 'Role',
        status: 'Status',
        admin: 'Admin',
        user: 'User',
        viewer: 'Viewer',
        readonly: 'Read-only',
        empty: 'No users configured',
        addTitle: 'Add user',
        required: 'Enter a username and password',
        created: 'User created',
        createFailed: 'Failed to create user',
        updateFailed: 'Failed to update user',
        updated: 'User updated successfully',
        deleted: 'User deleted',
        deleteFailed: 'Failed to delete user',
        resetPassword: 'Reset password',
        resetPasswordDescription: 'Enter a new password for “{username}”.',
        newPassword: 'New password',
        passwordRequired: 'Enter a new password',
        passwordReset: 'Password reset successfully',
        passwordResetFailed: 'Failed to reset password',
        usernameUpdated: 'Username updated',
        protected: 'System administrator',
        confirmDeleteTitle: "Delete user",
        confirmDelete: "Are you sure you want to delete \"{username}\"? This action cannot be undone."
    },
}

function flatten(tree: MessageTree, prefix = ''): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(tree)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (typeof value === 'string') {
            out[fullKey] = value
        } else {
            Object.assign(out, flatten(value, fullKey))
        }
    }
    return out
}

const messages: Record<Locale, Record<string, string>> = {
    'zh-TW': flatten(zhTW),
    en: flatten(en),
}

if (process.env.NODE_ENV !== 'production') {
    const zhKeys = Object.keys(messages['zh-TW'])
    const enKeys = Object.keys(messages.en)
    const zhSet = new Set(zhKeys)
    const enSet = new Set(enKeys)
    for (const key of zhKeys) if (!enSet.has(key)) console.warn(`[i18n] missing "en" translation for "${key}"`)
    for (const key of enKeys) if (!zhSet.has(key)) console.warn(`[i18n] missing "zh-TW" translation for "${key}"`)
}

type I18nContextValue = {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string, values?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectLocale(): Locale {
    if (typeof navigator === 'undefined') return 'zh-TW'
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
    return languages.some((language) => language.toLowerCase().startsWith('en')) ? 'en' : 'zh-TW'
}

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>('zh-TW')
    const { data: session, status } = useSession()

    useEffect(() => {
        const stored = getStoredSettings().locale
        const detected: Locale = isLocale(stored) ? stored : detectLocale()
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocale(detected)
        document.documentElement.lang = detected === 'en' ? 'en' : 'zh-Hant'
    }, [])

    useEffect(() => {
        if (status !== 'authenticated' || !isLocale(session?.user?.locale)) return
        saveSettings({ locale: session.user.locale })
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocale(session.user.locale)
        document.documentElement.lang = session.user.locale === 'en' ? 'en' : 'zh-Hant'
    }, [session?.user?.locale, status])

    const changeLocale = (nextLocale: Locale) => {
        saveSettings({ locale: nextLocale })
        setLocale(nextLocale)
        document.documentElement.lang = nextLocale === 'en' ? 'en' : 'zh-Hant'
    }

    const value = useMemo<I18nContextValue>(() => ({
        locale,
        setLocale: changeLocale,
        t: (key, values = {}) => {
            const template = messages[locale][key] ?? messages['zh-TW'][key] ?? key
            return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`))
        },
    }), [locale])

    return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (!context) throw new Error('useI18n must be used within I18nProvider')
    return context
}

const ERROR_KEYS: Record<string, string> = {
    'invalid username or password': 'login.invalidCredentials',
    'unable to reach gateway': 'gateway.unableToReach',
}

export function mapErrorKey(message?: string | null): string {
    if (!message) return 'login.errorGeneric'
    return ERROR_KEYS[message.trim().toLowerCase()] ?? 'login.errorGeneric'
}
