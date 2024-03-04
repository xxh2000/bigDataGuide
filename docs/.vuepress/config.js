module.exports = {
    title: '大数据Guide',
    themeConfig: {
        displayAllHeaders: true,
        sidebar: [
            {
                title:"Hive",
                path:'/',
                collapsable:true,
                sidebarDepth:6,
                children:[
                    {
                        title:"Hive面试题",
                        path:'/hive/hive面试题',
                        collapsable:false,
                        sidebarDepth:3,
                    }
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