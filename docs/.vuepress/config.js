module.exports = {
    title: '大数据Guide',
    themeConfig: {
        displayAllHeaders: true,
        sidebar: [
            {
                title:"Hive",
                path:'/hive',
                collapsable:false,
                sidebarDepth:6,
                children:[
                    {
                        title:"hive",
                        path:'/aaa',
                        collapsable:false,
                        sidebarDepth:3,
                        children:[
                            '/page/abb'
                        ]
                    }
                ]
            },
            {
                title:"Spark",
                path:'/spark',
                collapsable:false,
                sidebarDepth:3,
                children:[
                    '/page/abb'
                ]
            },
            {
                title:"Flink",
                path:'/flink',
                collapsable:false,
                sidebarDepth:3,
                children:[
                    '/page/abb'
                ]
            }
        ],
        nav: [
            {text: 'Home2', link: '/'},
            {text: 'Guide', link: '/guide/'},
            {text: 'External', link: 'https://google.com'},
        ],
    }
}