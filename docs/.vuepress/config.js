module.exports = {
    title: '大数据Guide',
    themeConfig: {
        displayAllHeaders: true,
        sidebar: [
            {
                title: "Hive",
                path: '/hive/',
                collapsable: false,
                sidebarDepth: 6,
                children: [
                    ['/hive/hive面试题','Hive面试题']
                ]
            },
            {
                title: 'OLAP',   // 必要的
                path: '',      // 可选的, 标题的跳转链接，应为绝对路径且必须存在
                collapsable: true, // 可选的, 默认值是 true,
                sidebarDepth: 3,    // 可选的, 默认值是 1
                children: [
                    {
                        title: "Clickhouse",
                        path: '',
                        collapsable: true,
                        sidebarDepth: 6,
                        children: [
                            // ['/olap/Clickhouse技术实践','Clickhouse技术实践']
                            {
                                title: "Clickhouse技术实践",
                                path: '/olap/Clickhouse技术实践',
                                collapsable: true,
                                sidebarDepth: 1,
                            }
                        ]
                    },
                    {
                        title: "StarRocks",
                        path: '',
                        collapsable: true,
                        sidebarDepth: 6,
                        children: [
                            // ['/olap/Clickhouse技术实践','Clickhouse技术实践']
                            {
                                title: "StarRocks技术实践",
                                path: '/olap/Starrocks技术实践.md',
                                collapsable: true,
                                sidebarDepth: 1,
                            }
                        ]
                    },

                ]
            },
        ],
        nav: [
            { text: 'Home', link: '/' },
        ],
    }
}
