### 面试SQL

* [Hive SQL 五大经典面试题_hivesql面试题](https://blog.csdn.net/weixin_43161811/article/details/123947852)

#### 计算连续7天登录用户

思路:
>1.用户每天可能不止登陆一次，将登录日期去重，取出当日登陆成功的日期，row_number()函数分组排序并计数
>2.日期减去计数得到值
>3.根据每个用户count(值)判断连续登陆天数
>4.最后取连续登陆天数大于等于7天的用户

**示例**

```sql
CREATE TABLE db_test.user_log_test(
datestr string comment ‘日期’,
uid string comment ‘用户id’,
status int comment ‘登陆状态 1:成功 0：失败’)
comment ‘用户登陆日志表’
stored as orc;
insert into db_test.user_log_test values(‘2020-08-30’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-30’,‘1’,0);
insert into db_test.user_log_test values(‘2020-08-29’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-28’,‘1’,0);
insert into db_test.user_log_test values(‘2020-08-27’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-26’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-25’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-24’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-23’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-22’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-21’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-20’,‘1’,1);
insert into db_test.user_log_test values(‘2020-08-25’,‘2’,1);
insert into db_test.user_log_test values(‘2020-08-24’,‘2’,1);
insert into db_test.user_log_test values(‘2020-08-23’,‘2’,0);
insert into db_test.user_log_test values(‘2020-08-22’,‘2’,1);
insert into db_test.user_log_test values(‘2020-08-21’,‘2’,1);
insert into db_test.user_log_test values(‘2020-08-20’,‘2’,1);
insert into db_test.user_log_test values(‘2020-08-26’,‘3’,1);
insert into db_test.user_log_test values(‘2020-08-25’,‘3’,1);
insert into db_test.user_log_test values(‘2020-08-24’,‘3’,1);
insert into db_test.user_log_test values(‘2020-08-23’,‘3’,1);
insert into db_test.user_log_test values(‘2020-08-22’,‘3’,1);
insert into db_test.user_log_test values(‘2020-08-21’,‘3’,1);
insert into db_test.user_log_test values(‘2020-08-20’,‘3’,1);
```

**计算步骤**

1. 计算出用户登陆成功的日期

   ```sql
   SELECT  uid
          ,datestr
   FROM
   (
   	SELECT  uid
   	       ,datestr
   	       ,ROW_NUMBER()over(PARTITION BY uid,datestr ORDER BY  datestr ASC) AS rn
   	FROM db_test.user_log_test
   	WHERE status = 1 
   ) a
   WHERE rn = 1
   ```

2. 日期减去计数得到值

   ```sql
   SELECT  uid
          ,date_sub(datestr,num) date_rn
   FROM
   (
   	SELECT  uid
   	       ,datestr
   	       ,ROW_NUMBER() over(PARTITION BY uid ORDER BY  datestr) AS num
   	FROM
   	(
   		SELECT  uid
   		       ,datestr
   		       ,ROW_NUMBER()over(PARTITION BY uid,datestr ORDER BY  datestr ASC) AS rn
   		FROM db_test.user_log_test
   		WHERE status = 1 
   	) a
   	WHERE rn = 1 
   ) b
   ```

3. 根据每个用户count(值)判断连续登陆天数

   ```sql
   select uid,     
        ,COUNT(*) cnt–连续登陆天数
   FROM
   (
   	SELECT  uid
   	       ,date_sub(datestr,num) date_rn
   	FROM
   	(
   		SELECT  uid
   		       ,datestr
   		       ,ROW_NUMBER() over(PARTITION BY uid ORDER BY  datestr) AS num
   		FROM
   		(
   			SELECT  uid
   			       ,datestr
   			       ,ROW_NUMBER()over(PARTITION BY uid,datestr ORDER BY  datestr ASC) AS rn
   			FROM db_test.user_log_test
   			WHERE status = 1 
   		) a
   		WHERE rn = 1 
   	) b
   )c
   GROUP BY  uid
            ,date_rn
   ```

4. 最后取连续登陆天数大于等于7天的用户

   ```sql
   SELECT  uid
   FROM
   (
   	SELECT  uid
   	       ,date_sub(datestr,num) date_rn
   	FROM
   	(
   		SELECT  uid
   		       ,datestr
   		       ,ROW_NUMBER() over(PARTITION BY uid ORDER BY  datestr) AS num
   		FROM
   		(
   			SELECT  uid
   			       ,datestr
   			       ,ROW_NUMBER()over(PARTITION BY uid,datestr ORDER BY  datestr ASC) AS rn
   			FROM db_test.user_log_test
   			WHERE status = 1 
   		) a
   		WHERE rn = 1 
   	) b
   )c
   GROUP BY  uid
            ,date_rn
   HAVING COUNT(1) >= 7
   ```

   **通过窗口函数解决**

   



