---
custom_edit_url: null
---
## Iceberg集成Hive

### 集成Hive配置

> Hive 版本为3.1.2, Iceberg版本为1.3.0

#### 添加jar包

在Hive安装目录下添加2个Jar包

- iceberg-hive-runtime-1.3.0.jar
- libfb303-0.9.3.jar(该包在Hive3.0后被Hive移除了，但是Iceberg需要使用这个包)

1. 启动Hive shell,执行add jar命令添加jar包.

```shell
add jar /opt/hive-3.1.2-bin/auxlib/iceberg-hive-runtime-1.3.0.jar;

add jar /opt/hive-3.1.2-bin/auxlib/libfb303-0.9.3.jar;
```

#### 配置开启Iceberg

1. 配置开启Iceberg

在Hive客户端$HIVE_HOME/conf/hive-site.xml中添加如下配置：

```xml
<property>
  <name>iceberg.engine.hive.enabled</name>
  <value>true</value>
</property>
```

或者在Hive Shell中配置

```shell
set iceberg.engine.hive.enabled=true;
```

####  启动Hive MetaStore服务

Iceberg需要连接HiveMetaStore用来作为Catalog，因此需要开<br />  启MetaStore服务<br />  先在hive-site.xml中配置metastore

```xml
<property>
  <name>hive.metastore.uris</name>
  <value>thrift://hadoop2:9083</value>
  <description>Thrift URI for the remote metastore. Used by metastore client to connect to remote metastore.</description>
</property>
```

启动Hive MetaStore服务

```shell
 hive --service metastore
```

### 创建表

#### 使用Hive默认的Catalog

如果没有设置iceberg.catalog属性，默认使用HiveCatalog来加载，这种方式就是说如果在Hive中创建Iceberg格式表时，不指定iceberg.catalog属性，那么数据存储在对应的hive warehouse路径下。

```sql
#在Hive中创建iceberg格式表
create table test_iceberg_tbl1(
  id int ,
  name string,
  age int) 
partitioned by (dt string) 
stored by 'org.apache.iceberg.mr.hive.HiveIcebergStorageHandler';
```

插入数据

```sql
insert into test_iceberg_tbl1 values (1,"zs",18,"20211212");
```

#### 自定义HiveCatalog名称

这种情况就是说在Hive中创建Iceberg格式表时，如果指定了iceberg.catalog属性值，那么数据存储在指定的catalog名称对应配置的目录下。其实自定义HiveCatalog的效果和默认的Hive Catalog一样,没什么区别。

```sql
SET iceberg.catalog.another_hive.type=hive;
SET iceberg.catalog.another_hive.uri=thrift://hadoop2:9083;
SET iceberg.catalog.another_hive.clients=10;
SET iceberg.catalog.another_hive.warehouse=hdfs://hadoop1:9098/warehouse/another_hive;
```

创建表

```plsql
create table another_hive.test_iceberg_tbl4(
  id int,
  name string,
  age int
)
partitioned by (dt string)
stored by 'org.apache.iceberg.mr.hive.HiveIcebergStorageHandler'
tblproperties ('iceberg.catalog'='another_hive');
```

如果要自定义表的存储路径，那么需要增加location属性，如下：

```plsql
create table test_iceberg_tbl6(
  id int,
  name string,
  age int
)
partitioned by (dt string)
stored by 'org.apache.iceberg.mr.hive.HiveIcebergStorageHandler'
location  '/tmp/iceberg/test_iceberg_tbl5'
tblproperties ('iceberg.catalog'='another_hive');
```

#### 配置Hadoop Catalog

```plsql
SET iceberg.catalog.hadoop.type=hadoop;
SET iceberg.catalog.hadoop.warehouse=hdfs://hadoop1:9098/iceberg/warehouse;
```

创建表

```sql
create external table test_iceberg_tbl3(
  id int,
  name string,
  age int
)
partitioned by (dt string)
stored by 'org.apache.iceberg.mr.hive.HiveIcebergStorageHandler'
location 'hdfs://hadoop1:9098/iceberg/warehouse/default/test_iceberg_tbl3'
tblproperties ('iceberg.catalog'='hadoop');
```

注意：以上location指定的路径必须是“iceberg.catalog.hadoop.warehouse”指定路径的子路径,格式必须是```${iceberg.catalog.hadoop.warehouse}```/ ```${当前建表使用的hive库}```/ ```${创建的当前iceberg表名}```。<br />**查看表结构**

```sql
CREATE EXTERNAL TABLE `test_iceberg_tbl3`(
  `id` int COMMENT 'from deserializer',
  `name` string COMMENT 'from deserializer',
  `age` int COMMENT 'from deserializer',
  `dt` string COMMENT 'from deserializer')
ROW FORMAT SERDE
  'org.apache.iceberg.mr.hive.HiveIcebergSerDe'
STORED BY
  'org.apache.iceberg.mr.hive.HiveIcebergStorageHandler'
WITH SERDEPROPERTIES (
  'serialization.format'='1')
LOCATION
  'hdfs://hadoop1:9098/iceberg/warehouse/default/test_iceberg_tbl3'
TBLPROPERTIES (
  'bucketing_version'='2',
  'external.table.purge'='TRUE',
  'iceberg.catalog'='hadoop',
  'table_type'='ICEBERG',
  'transient_lastDdlTime'='1706019628')

```

**插入数据**

```sql
insert into test_iceberg_tbl3 values (3,"ww",20,"20211213");
```

## Iceberg集成Spark

### Spark代码

> 版本：Spark 3.3.2 Iceberg 1.4.3

#### Maven配置

```java
<properties>
  <spark.version>3.3.2</spark.version>
  <hive.version>3.1.2</hive.version>
  <scala.version>2.12</scala.version>
  <iceberg.version>1.4.3</iceberg.version>
</properties>
<dependencies>
  <dependency>
    <groupId>org.apache.spark</groupId>
    <artifactId>spark-core_2.12</artifactId>
    <version>${spark.version}</version>
  </dependency>
  <dependency>
    <groupId>org.apache.spark</groupId>
    <artifactId>spark-sql_2.12</artifactId>
    <version>${spark.version}</version>
  </dependency>
  <dependency>
    <groupId>org.apache.hive</groupId>
    <artifactId>hive-jdbc</artifactId>
    <version>3.1.2</version>
  </dependency>
  <dependency>
    <groupId>log4j</groupId>
    <artifactId>log4j</artifactId>
    <version>1.2.17</version>
  </dependency>
  <dependency>
    <groupId>org.apache.spark</groupId>
    <artifactId>spark-hive_2.12</artifactId>
    <version>${spark.version}</version>
  </dependency>
  <dependency>
    <groupId>org.apache.hadoop</groupId>
    <artifactId>hadoop-client</artifactId>
    <version>3.2.0</version>
  </dependency>
  <dependency>
    <groupId>org.apache.hadoop</groupId>
    <artifactId>hadoop-common</artifactId>
    <version>2.7.2</version>
  </dependency>
  <dependency>
    <groupId>org.apache.iceberg</groupId>
    <artifactId>iceberg-spark</artifactId>
    <version>${iceberg.version}</version>
  </dependency>
  <dependency>
    <groupId>org.apache.iceberg</groupId>
    <artifactId>iceberg-spark-runtime-3.3_2.12</artifactId>
    <version>${iceberg.version}</version>
  </dependency>
  <dependency>
    <groupId>org.apache.avro</groupId>
    <artifactId>avro</artifactId>
    <version>1.10.2</version>
  </dependency>
  <dependency>
    <groupId>org.apache.parquet</groupId>
    <artifactId>parquet-hadoop</artifactId>
    <version>1.12.2</version>
  </dependency>
  <dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>5.1.37</version>
  </dependency>
</dependencies>
```

#### 代码实现

1. 配置Hive catalog

```scala
val ss: SparkSession = SparkSession.builder().master("local[*]")
.appName("SparkIcebergDemo")
.config("spark.sql.catalog.hive_prod", "org.apache.iceberg.spark.SparkCatalog")
.config("spark.sql.catalog.hive_prod.type", "hive")
.config("spark.sql.catalog.hive_prod.uri", "thrift://hadoop2:9083")
.getOrCreate()
```

2. 配置Hadoop Catalog

```scala
val ss: SparkSession = SparkSession.builder().master("local[*]")
.appName("SparkIcebergDemo")
.config("spark.sql.catalog.hadoop_prod", "org.apache.iceberg.spark.SparkCatalog")
.config("spark.sql.catalog.hadoop_prod.type", "hadoop")
.config("spark.sql.catalog.hadoop_prod.warehouse", "hdfs://hadoop1:9098/warehouse/sparkiceberg")
.getOrCreate()
```

注意,window需要配置

```scala
System.setProperty("hadoop.home.dir","D:\\aaa\\hadoop-2.7.6\\hadoop-2.7.6");
//必须要设置,否则spark会写hive会报HDFS权限问题
System.setProperty("HADOOP_USER_NAME","root");
```

2. 创建表

```scala
ss.sql(
  """
             |CREATE TABLE catalog_name.default.table1 (id bigint, data string) USING iceberg
           """.stripMargin)
```

#### DataFrame读取表

```scala
val ss: SparkSession = SparkSession.builder().master("local[*]")
.appName("SparkIcebergDemo")
.config("spark.sql.catalog.hadoop_prod", "org.apache.iceberg.spark.SparkCatalog")
.config("spark.sql.catalog.hadoop_prod.type", "hadoop")
.config("spark.sql.catalog.hadoop_prod.warehouse", "hdfs://hadoop1:9098/warehouse/sparkiceberg")
.getOrCreate()


ss.read.format("iceberg").load("hadoop_prod.xxx.tb4").show()
```

第二种方式

```scala
ss.table("hadoop_prod.xxx.tb4").show()
```

#### 查询快照信息

```scala
 select * from hadoop_prod.xxx.tb4.snapshots
```

#### 查询快照表

```scala
ss.read.format("iceberg")
.option("snapshot-id",6268558238709300005L)
.load("hadoop_prod.xxx.tb4").show()
```

#### 查询时间戳数据

```scala
ss.read.format("iceberg")
.option("as-of-timestamp",1706231158560L)
.load("hadoop_prod.xxx.tb4").show()
```

#### 回滚到某个快照

Spark DataFrame 不支持回滚到快照<br />Spark3.x后sql的形式可以回滚<br />但是我在测试的时候并没有成功。使用Java API 可以实现快照回滚

```java
System.setProperty("hadoop.home.dir","D:\\aaa\\hadoop-2.7.6\\hadoop-2.7.6");
//必须要设置,否则spark会写hive会报HDFS权限问题
System.setProperty("HADOOP_USER_NAME","root");
Configuration conf = new Configuration();
HadoopCatalog catalog = new HadoopCatalog(conf, "hdfs://hadoop1:9098/warehouse/sparkiceberg");
catalog.setConf(conf);
Table table = catalog.loadTable(TableIdentifier.of("xxx", "person_info"));
table.manageSnapshots().rollbackTo(7076891289188705084L).commit();
```

#### 合并Compact

合并小文件数据,Iceberg合并小文件时并不会删除被合并的文件，Compact是将小文件合并成大文件并创建新的Snapshot

```java
//2) 合并小文件数据,Iceberg合并小文件时并不会删除被合并的文件，
// Compact是将小文件合并成大文件并创建新的Snapshot。
// 如果要删除文件需要通过Expire Snapshots来实现,targetSizeInBytes 指定合并后的每个文件大小
Configuration conf = new Configuration();
HadoopCatalog catalog = new HadoopCatalog(conf,"hdfs://hadoop1:9098/warehouse/sparkiceberg");
Table table = catalog.loadTable(TableIdentifier.of("xxx","person_info"));
SparkSession sparkSession = SparkSession.builder().master("local[1]")
.appName("SparkIcebergDemo")
.config("spark.sql.catalog.hadoop_prod", "org.apache.iceberg.spark.SparkCatalog")
.config("spark.sql.catalog.hadoop_prod.type", "hadoop")
.config("spark.sql.catalog.hadoop_prod.warehouse", "hdfs://hadoop1:9098/warehouse/sparkiceberg")
.getOrCreate();
SparkActions sparkActions = SparkActions.get(sparkSession);
RewriteDataFilesSparkAction rewriteDataFilesSparkAction = sparkActions.rewriteDataFiles(table);
rewriteDataFilesSparkAction.execute();
```

### Spark Sql Shell

#### Hadoop Catalog

```shell
bin/spark-sql --packages org.apache.iceberg:iceberg-spark-runtime-3.2_2.12:1.4.3\
    --conf spark.sql.catalog.hadoop_prod=org.apache.iceberg.spark.SparkCatalog \
	  --conf spark.sql.extensions=org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions \
    --conf spark.sql.catalog.hadoop_prod.type=hadoop \
    --conf spark.sql.catalog.hadoop_prod.warehouse=hdfs://hadoop1:9098/warehouse/sparkiceberg
```

## 读取流程

![](https://cdn.nlark.com/yuque/0/2024/png/390265/1706105747326-4ba93cce-ab82-440b-904c-95525b02728e.png#averageHue=%23fcd6d2&clientId=u651027a0-ca68-4&from=paste&id=u244dec96&originHeight=533&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u21d572fb-827a-4978-86c9-468c20eebc4&title=)<br />假设我们的表是存储在 Hive 的 MetaStore 里面的，表名为 iteblog，并且数据的组织结构如上如所示。

### 查询最新快照的数据

- 通过数据库名和表名，从 Hive 的 MetaStore 里面拿到表的信息。从表的属性里面其实可以拿到 metadata_location 属性，通过这个属性可以拿到 iteblog 表的 Iceberg 的 metadata 相关路径，这个也就是上图步骤①的 /user/iteblog/metadata/2.metadata.json。
- 解析 /user/iteblog/metadata/2.metadata.json 文件，里面可以拿到当前表的快照 id（current-snapshot-id），以及这张表的所有快照信息，也就是 JOSN 信息里面的 snapshots 数组对应的值。从上图可以看出，当前表有两个快照，id 分别为 1 和 2。快照 1 对应的清单列表文件为 /user/iteblog/metastore/snap-1.avro；快照 2 对应的清单列表文件为 /user/iteblog/metastore/snap-2.avro。
- 如果我们想读取表的最新快照数据，从 current-snapshot-id 可知，当前最新快照的 ID 等于 2，所以我们只需要解析 /user/iteblog/metastore/snap-2.avro 清单列表文件即可。从上图可以看出，snap-2.avro 这个清单列表文件里面有两个清单文件，分别为 /user/iteblog/metadata/3.avro 和 /user/iteblog/metadata/2.avro。注意，除了清单文件的路径信息，还有 added_data_files_count、existing_data_files_count 以及 deleted_data_files_count 三个属性。Iceberg 其实是根据 deleted_data_files_count 大于 0 来判断对应的清单文件里面是不是被删除的数据。由于上图 /user/iteblog/metadata/2.avro 清单文件的 deleted_data_files_count 大于 0 ，所以读数据的时候就无需读这个清单文件里面对应的数据文件。在这个场景下，读取最新快照数据只需要看下 /user/iteblog/metadata/3.avro 清单文件里面对应的数据文件即可。
- 这时候 Iceberg 会解析 /user/iteblog/metadata/3.avro 清单文件，里面其实就只有一行数据，也就是 /user/iteblog/data/4.parquet，所以我们读 iteblog 最新的数据其实只需要读 /user/iteblog/data/4.parquet 数据文件就可以了。注意，上面 /user/iteblog/data/2.avro 文件里面对应的内容为

```json
{"status":2,"data_file":{"file_path":"/user/iteblog/data/3.parquet"}}
{"status":2,"data_file":{"file_path":"/user/iteblog/data/2.parquet"}}{“status":2,"data_file":{"file_path":"/user/iteblog/data/1.parquet"}}
```

其中的 status = 2 代表 DELETED，也就是删除，也印证了读最新快照的数据其实不用读 /user/iteblog/data/2.avro 清单文件的数据文件。而 /user/iteblog/data/3.avro 清单文件里面存储的内容为 `{"status":1,"data_file":{"file_path":"/user/iteblog/data/4.parquet"}}，其 status = 1`，代表 ADDED，也就是新增的文件，所以得读取。

### 查询某个快照的数据

Apache Iceberg 支持查询历史上任何时刻的快照，在查询的时候只需要指定 snapshot-id 属性即可，比如我们想查询上面 snapshot-id 为 1 的数据，可以在 Spark 中这么写：<br />`spark.read .option("snapshot-id", 1L) .format("iceberg") .load("path/to/table")` 下面是读取指定快照的图示<br />![](https://cdn.nlark.com/yuque/0/2024/png/390265/1706105948937-3f07fa5e-2bb4-4a69-b94e-67fbb7a18b84.png#averageHue=%23fcdbd8&clientId=u651027a0-ca68-4&from=paste&id=ue6857bc0&originHeight=534&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u90932cf2-9ed6-4b98-a9f7-8987305ea83&title=)<br />从上图可以看出，和读取最新快照数据不一样的地方是上图中的第三步。由于我们指定了 snapshot-id = 1，所以 Iceberg 会读取上面第二步白色的部分，可以知道，snapshot-id = 1 对应的清单列表文件为 /user/iteblog/metastore/snap-1.avro。这时候读出清单列表里面的文件，其实就只有一行数据，对应的清单文件为 /user/iteblog/metadata/1.avro，其中 added_data_files_count 为 3。<br />下一步我们读取 /user/iteblog/metadata/1.avro 清单文件，可以看到里面有三个数据文件路径，这些数据文件就是 snapshot-id = 1 的数据。

### 根据时间戳查看某个快照的数据

Iceberg 还支持通过 as-of-timestamp 参数指定时间戳来读取某个快照的数据。如下所示：

```scala
spark.read.option("as-of-timestamp","12346").format("iceberg").load("path/to/table")
```

![](https://cdn.nlark.com/yuque/0/2024/png/390265/1706106006170-7c0ff5bc-9b1b-4312-8d8c-20885b4cd7be.png#averageHue=%23fdd9d6&clientId=u651027a0-ca68-4&from=paste&id=ud6f371f5&originHeight=580&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=uf47468df-0b14-417f-9448-86f10bd292e&title=)<br />我们注意上面图中第二步里面的 JSON 数据里面有个 snapshot-log 数组，如下：

```scala
"snapshot-log":[{"timestamp-ms":12345,"snapshot-id":1},{"timestamp-ms":23456,"snapshot-id":2}]
```

每个列表里面都有个 timestamp-ms 属性和 snapshot-id 属性，并且是按照 timestamp-ms 升序的。在 Iceberg 内部实现中，它会将 as-of-timestamp 指定的时间和 snapshot-log 数组里面每个元素的 timestamp-ms 进行比较，找出最后一个满足 `timestamp-ms <= as-of-timestamp` 对应的 snapshot-id。<br />由于 as-of-timestamp=12346 比 12345 时间戳大，但是比 23456 小，所以会取 snapshot-id = 1，也就是拿到 snapshot-id = 1 的快照数据。剩下的数据查询步骤和在查询中指定 snapshot-id 是一致的。

## DDL

### 分区表

**正常分区表**

```plsql
CREATE TABLE prod.db.sample (
  id bigint,
  data string,
  category string)
USING iceberg
PARTITIONED BY (category)
```

### 隐式分区

**创建隐式分区表**

```scala
ss.sql(
  """
              |CREATE TABLE  if  not exists hadoop_prod.xxx.tb3 (
              |    id bigint,
              |    data string,
              |    category string,
              |    ts timestamp)
              |USING iceberg
              |PARTITIONED BY (years(ts))
            """.stripMargin)

```

Supported transformations are:

- year(ts): partition by year
- month(ts): partition by month
- day(ts) or date(ts): equivalent to dateint partitioning
- hour(ts) or date_hour(ts): equivalent to dateint and hour partitioning
- bucket(N, col): partition by hashed value mod N buckets
- truncate(L, col): partition by value truncated to L
  - Strings are truncated to the given length
  - Integers and longs truncate to bins: truncate(10, i) produces partitions 0, 10, 20, 30, …

**插入隐式分区数据**<br />注意需要cast转换数据格式

```sql
        ss.sql(
          """
          |insert into hadoop_prod.xxx.tb3 values
          |(1,'zhangsan','sh',cast(1706193103 as timestamp)),
          |(2,'lisi','sz',cast(1674657103 as timestamp)),
          |(3,'wangwu','wh',cast(1706193103 as timestamp)),
          |(4,'zhaoliu','lz',cast(1674657103 as timestamp))
          """.stripMargin)
```

### Creat Table as select

```shell
        ss.sql(
            """
              |CREATE TABLE  if  not exists hadoop_prod.xxx.tb4
              |USING iceberg
              |select * from hadoop_prod.xxx.tb3
            """.stripMargin)

```

## 写操作

### MergeINTO

Spark 3 添加了对 MERGE INTO 查询的支持，该查询可表达行级更新。Iceberg 通过重写包含需要在 overwrite 提交中更新的行的数据文件来支持 MERGE INTO。建议使用 MERGE INTO，而不是 INSERT OVERWRITE，因为 Iceberg 只能替换受影响的数据文件，而且如果表的分区发生变化，动态覆盖所覆盖的数据也可能发生变化。<br />MERGE INTO 使用来自另一个查询（称为源查询）的一组更新来更新一个表（称为目标表）。使用 ON 子句可以找到目标表中某行的更新，该子句类似于连接条件.<br />**语法**

```sql
MERGE INTO prod.db.target t   -- a target table
USING (SELECT ...) s          -- the source updates
ON t.id = s.id                -- condition to find updates for target rows
WHEN ...
```

**代码实例**<br /> 注意下面的代码中必须加，否则会报错`Exception in thread "main" java.lang.UnsupportedOperationException: MERGE INTO TABLE is not supported temporarily`.

```scala
.config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
```

```scala
val spark: SparkSession = SparkSession.builder().master("local[1]")
.appName("SparkIcebergDemo")
.config("spark.sql.catalog.hadoop_prod", "org.apache.iceberg.spark.SparkCatalog")
.config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
.config("spark.sql.catalog.hadoop_prod.type", "hadoop")
.config("spark.sql.catalog.hadoop_prod.warehouse", "hdfs://hadoop1:9098/warehouse/sparkiceberg")
.getOrCreate()

//创建一张表 a ，并插入数据
spark.sql(
  """
    |create table  hadoop_prod.default.a (id int,name string,age int) using iceberg
  """.stripMargin)
spark.sql(
  """
    |insert into hadoop_prod.default.a values (1,"zs",18),(2,"ls",19),(3,"ww",20)
  """.stripMargin)
//创建另外一张表b ,并插入数据
spark.sql(
  """
    |create table  hadoop_prod.default.b (id int,name string,age int,tp string) using iceberg
  """.stripMargin)
spark.sql(
  """
    |insert into hadoop_prod.default.b values (1,"zs",30,"delete"),(2,"李四",31,"update"),(4,"王五",32,"add")
  """.stripMargin)

//将表b 中与表a中相同id的数据更新到表a,表a中没有表b中有的id对应数据写入增加到表a
spark.sql(
  """
   |merge into hadoop_prod.default.a  t1
   |using (select id,name ,age,tp from hadoop_prod.default.b) t2
   |on t1.id = t2.id
   |when matched and t2.tp = 'delete' then delete
   |when matched and t2.tp = 'update' then update set t1.name = t2.name,t1.age = t2.age
   |when not matched then insert (id,name,age) values (t2.id,t2.name,t2.age)
  """.stripMargin)

```

### INSERT OVERWRIT

INSERT OVERWRITE可以用查询结果替换表中的数据。覆盖是 Iceberg 表的原子操作。<br />INSERT OVERWRITE 替换的分区取决于 Spark 的分区覆盖模式和表的分区情况。 MERGE INTO 只能重写受影响的数据文件，并且具有更容易理解的行为，因此建议代替 INSERT OVERWRITE。<br />Spark默认的覆盖模式是静态的，但是在写入Iceberg表时建议使用动态覆盖模式。静态覆盖模式通过将PARTITION子句转换为过滤器来确定要覆盖表中的哪些分区，但PARTITION子句只能引用表列。

#### 动态分区覆盖

动态覆盖会全量将原有数据覆盖，并将新插入的数据根据Iceberg表分区规则自动分区，类似Hive中的动态分区。

#### 静态分区覆盖

静态覆盖需要在向Iceberg中插入数据时需要手动指定分区，如果当前Iceberg表存在这个分区，那么只有这个分区的数据会被覆盖，其他分区数据不受影响，如果Iceberg表不存在这个分区，那么相当于给Iceberg表增加了个一个分区.

### Update

Spark3.x+版本支持了update更新数据操作，可以根据匹配的条件进行数据更新操作。操作如下：

```shell
//创建表 delete_tbl ,并加载数据
spark.sql(
  """
    |create table hadoop_prod.default.update_tbl (id int,name string,age int) using iceberg
    |""".stripMargin)
spark.sql(
  """
    |insert into hadoop_prod.default.update_tbl values (1,"zs",18),(2,"ls",19),(3,"ww",20),(4,"ml",21),(5,"tq",22),(6,"gb",23)
  """.stripMargin)

```

通过“update”更新表中id小于等于3的数据name列改为“zhangsan”,age列改为30，操作如下：

```shell
//更新 delete_tbl 表
spark.sql(
  """
    |update hadoop_prod.default.update_tbl set name = 'zhangsan' ,age = 30
    |where id <=3
  """.stripMargin)
spark.sql(
  """
    |select * from hadoop_prod.default.update_tbl
  """.stripMargin).show()

```

### DataFrame API 写入Iceberg表

Spark向Iceberg中写数据时不仅可以使用SQL方式，也可以使用DataFrame Api方式操作Iceberg,建议使用SQL方式操作。<br />DataFrame创建Iceberg表分为创建普通表和分区表，创建分区表时需要指定分区列，分区列可以是多个列。创建表的语法如下:

```scala
df.write(tbl).create() 相当于 CREATE TABLE AS SELECT ...
df.write(tbl).replace() 相当于 REPLACE TABLE AS SELECT ...
df.write(tbl).append() 相当于 INSERT INTO ...
df.write(tbl).overwritePartitions() 相当于动态 INSERT OVERWRITE ...
```

具体操作如下

```scala
//1.准备数据，使用DataFrame Api 写入Iceberg表及分区表
val nameJsonList = List[String](
  "{\"id\":1,\"name\":\"zs\",\"age\":18,\"loc\":\"beijing\"}",
  "{\"id\":2,\"name\":\"ls\",\"age\":19,\"loc\":\"shanghai\"}",
  "{\"id\":3,\"name\":\"ww\",\"age\":20,\"loc\":\"beijing\"}",
  "{\"id\":4,\"name\":\"ml\",\"age\":21,\"loc\":\"shanghai\"}")

import spark.implicits._
val df: DataFrame = spark.read.json(nameJsonList.toDS)

//创建普通表df_tbl1,并将数据写入到Iceberg表，其中DF中的列就是Iceberg表中的列
df.writeTo("hadoop_prod.default.df_tbl1").create()

//查询表 hadoop_prod.default.df_tbl1 中的数据，并查看数据存储结构
spark.read.table("hadoop_prod.default.df_tbl1").show()

```

```scala
//创建分区表df_tbl2,并将数据写入到Iceberg表，其中DF中的列就是Iceberg表中的列
df.sortWithinPartitions($"loc")//写入分区表，必须按照分区列进行排序
  .writeTo("hadoop_prod.default.df_tbl2")
  .partitionedBy($"loc")//这里可以指定多个列为联合分区
  .create()
//查询分区表 hadoop_prod.default.df_tbl2 中的数据，并查看数据存储结构
spark.read.table("hadoop_prod.default.df_tbl2").show()

```

## Structured Streaming实时写入Iceberg

```scala
import java.util.concurrent.TimeUnit

import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.streaming.{Trigger, StreamingQuery}
import org.apache.spark.sql.{DataFrame, SparkSession}

/**
  * Created by Administrator on 2024/1/29 0029.
  */
object StructuredStreamingSinkIceberg {

  def main(args: Array[String]) {
    System.setProperty("hadoop.home.dir", "D:\\aaa\\hadoop-2.7.6\\hadoop-2.7.6");
    //必须要设置,否则spark会写hive会报HDFS权限问题
    System.setProperty("HADOOP_USER_NAME", "root");

    val spark: SparkSession = SparkSession.builder().master("local[1]")
    .appName("SparkIcebergDemo")
    .config("spark.sql.catalog.hadoop_prod", "org.apache.iceberg.spark.SparkCatalog")
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
    .config("spark.sql.catalog.hadoop_prod.type", "hadoop")
    .config("spark.sql.catalog.hadoop_prod.warehouse", "hdfs://hadoop1:9098/warehouse/sparkiceberg")
    .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    import spark.implicits._
    //2.创建Iceberg 表
    spark.sql(
      """
              |create table if not exists hadoop_prod.iceberg_db.iceberg_table (
              | current_day string,
              | user_id string,
              | page_id string,
              | channel string,
              | action string
              |) using iceberg
            """.stripMargin)

    //多个topic 逗号分开
    val topic = "kafka-iceberg-topic"
    val bootstrapServers = "hadoop1:9092,hadoop2:9092,hadoop3:9092"
    //3.读取Kafka读取数据
    val df = spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", bootstrapServers)
    .option("auto.offset.reset", "earliest")
    .option("group.id", "iceberg-kafka")
    .option("subscribe", topic)
    .load()
    import spark.implicits._
    import org.apache.spark.sql.functions._

    val resDF = df.selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)")
    .as[(String, String)].toDF("id", "data")
    val transDF: DataFrame = resDF.withColumn("current_day", split(col("data"), "\t")(0))
    .withColumn("ts", split(col("data"), "\t")(1))
    .withColumn("user_id", split(col("data"), "\t")(2))
    .withColumn("page_id", split(col("data"), "\t")(3))
    .withColumn("channel", split(col("data"), "\t")(4))
    .withColumn("action", split(col("data"), "\t")(5))
    .select("current_day", "user_id", "page_id", "channel", "action")

    //结果打印到控制台,Default trigger (runs micro-batch as soon as it can)
    /*     val query: StreamingQuery = transDF.writeStream
          .outputMode("append")
          .format("console")
          .option("checkpointLocation", "/tmp/checkpoint1/wordocunt8") // 设置 checkpoint 目录以支持 Exactly-Once 语义
          .trigger(Trigger.ProcessingTime("2 second")) // 可以设置触发器，这里每秒触发一次
          .start()*/
    val query = transDF.writeStream
    .format("iceberg")
    .outputMode("append")
    //每分钟触发一次Trigger.ProcessingTime(1, TimeUnit.MINUTES)
    //每10s 触发一次 Trigger.ProcessingTime(1, TimeUnit.MINUTES)
    .trigger(Trigger.ProcessingTime(10, TimeUnit.SECONDS))
    .option("path", "hadoop_prod.iceberg_db.iceberg_table")
    .option("fanout-enabled", "true")
    .option("checkpointLocation", "/tmp/checkpoint1/wordocunt8") // 设置 checkpoint 目录以支持 Exactly-Once 语义
    .start()

    query.awaitTermination()
  }

}

```

## Iceberg集成Flink

> Flink 版本1.16.2, Iceberg 版本1.4.3

### Maven Pom

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.daiyutage</groupId>
  <artifactId>Flink-Iceberg</artifactId>
  <version>1.0-SNAPSHOT</version>

  <properties>
    <maven.compiler.source>8</maven.compiler.source>
    <maven.compiler.target>8</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <flink-version>1.16.2</flink-version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-core</artifactId>
      <version>${flink-version}</version>
    </dependency>
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-clients</artifactId>
      <version>${flink-version}</version>
    </dependency>
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-streaming-java</artifactId>
      <version>${flink-version}</version>
    </dependency>
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-table-planner_2.12</artifactId>
      <version>${flink-version}</version>
    </dependency>
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-connector-kafka</artifactId>
      <version>${flink-version}</version>
    </dependency>
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-runtime-web</artifactId>
      <version>${flink-version}</version>
    </dependency>



    <!--        <dependency>
    <groupId>org.apache.iceberg</groupId>
    <artifactId>iceberg-flink</artifactId>
    <version>1.4.3</version>
  </dependency>-->
    <dependency>
      <groupId>org.apache.iceberg</groupId>
      <artifactId>iceberg-flink-runtime-1.16</artifactId>
      <version>1.4.3</version>
    </dependency>
    <dependency>
      <groupId>org.apache.hadoop</groupId>
      <artifactId>hadoop-common</artifactId>
      <!--<version>2.7.2</version>-->
      <version>3.2.2</version>
    </dependency>
    <dependency>
      <groupId>org.apache.hadoop</groupId>
      <artifactId>hadoop-client</artifactId>
      <version>3.2.0</version>
    </dependency>
  </dependencies>
</project>
```

### 创建表

```java
package com.daiyutage.flink.iceberg;

import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.EnvironmentSettings;
import org.apache.flink.table.api.TableEnvironment;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.table.data.RowData;
import org.apache.flink.table.data.StringData;
import org.apache.iceberg.flink.TableLoader;
import org.apache.iceberg.flink.source.FlinkSource;

/**
 * Created by Administrator on 2024/1/31 0031.
 */
public class FlinkIcebergExample2 {

    public static void main(String[] args) throws Exception {

        /**
         * 使用Flink SQL 创建Iceberg表,并写入数据
         */

        System.setProperty("hadoop.home.dir", "D:\\aaa\\hadoop-2.7.6\\hadoop-2.7.6");
        //必须要设置,否则spark会写hive会报HDFS权限问题
        System.setProperty("HADOOP_USER_NAME", "root");

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        StreamTableEnvironment tblEnv = StreamTableEnvironment.create(env);

        env.enableCheckpointing(1000);

        //1.创建Catalog
        tblEnv.executeSql("CREATE CATALOG hadoop_iceberg WITH (" +
                          "'type'='iceberg'," +
                          "'catalog-type'='hadoop'," +
                          "'warehouse'='hdfs://hadoop1:9098/warehouse/flinkiceberg')");

        //2.使用当前Catalog
        tblEnv.useCatalog("hadoop_iceberg");

        //3.创建数据库
        tblEnv.executeSql("use database iceberg_db");

        //4.使用数据库
        tblEnv.useDatabase("iceberg_db");

        //5.创建iceberg表 flink_iceberg_tbl
        tblEnv.executeSql("create table hadoop_iceberg.iceberg_db.flink_iceberg_tbl1(id int,name string,age int,loc string) partitioned by (loc)");

        //6.写入数据到表 flink_iceberg_tbl
               tblEnv.executeSql("insert into hadoop_iceberg.iceberg_db.flink_iceberg_tbl1 values (1,'zs',18,'beijing'),(2,'ls',19,'shanghai'),(3,'ww',20,'guangzhou')");

    }
}

```

### 读取表

Flink可以批量读取表或者是流式读取表。

```java
package com.daiyutage.flink.iceberg;

import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.data.RowData;
import org.apache.flink.table.data.StringData;
import org.apache.iceberg.flink.TableLoader;
import org.apache.iceberg.flink.source.FlinkSource;

/**
 * Created by Administrator on 2024/1/31 0031.
 */
public class FlinkIcebergExample1 {

    public static void main(String[] args) throws Exception {

        /**
         * 使用Flink DataStream API 批量(流失)读取Iceberg表数据
         */

        System.setProperty("hadoop.home.dir", "D:\\aaa\\hadoop-2.7.6\\hadoop-2.7.6");
        //必须要设置,否则spark会写hive会报HDFS权限问题
        System.setProperty("HADOOP_USER_NAME", "root");
        StreamExecutionEnvironment env = StreamExecutionEnvironment.createLocalEnvironment();
        TableLoader tableLoader = TableLoader.fromHadoopTable("hdfs://hadoop1:9098/warehouse/flinkiceberg/iceberg_db/flink_iceberg_tbl2");
        DataStream<org.apache.flink.table.data.RowData> dataStream = FlinkSource.forRowData()
        .env(env)
        .tableLoader(tableLoader)
        .streaming(true) //true为流式读取,false为批量一次读取
        .build();

        /**
         *
         *         val transDF: DataFrame = resDF.withColumn("current_day", split(col("data"), "\t")(0))
         .withColumn("ts", split(col("data"), "\t")(1))
         .withColumn("user_id", split(col("data"), "\t")(2))
         .withColumn("page_id", split(col("data"), "\t")(3))
         .withColumn("channel", split(col("data"), "\t")(4))
         .withColumn("action", split(col("data"), "\t")(5))
         .select("current_day", "user_id", "page_id", "channel", "action")
         */
        // Print all records to stdout.
        dataStream.map(new MapFunction<RowData, String>() {
            @Override
            public String map(RowData rowData) throws Exception {
                Integer current_day = rowData.getInt(0);
                StringData user_id = rowData.getString(1);
                Integer age = rowData.getInt(2);
                StringData channel = rowData.getString(3);
                return current_day + "," + user_id + "," + age + "," + channel ;
            }
        }).print();

        // Submit and execute this batch read job.
        env.execute("Test Iceberg Batch Read");
    }
}
```

### 实时写入表

消费Kafka数据，然后实时写入Iceberg表。注意，必须要开启checkpoint机制，否则不会commit数据,写入之后是没有效果的。

```java
package com.daiyutage.flink.iceberg;

import com.google.common.collect.ImmutableMap;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.configuration.RestOptions;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStreamSource;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.sink.PrintSinkFunction;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.table.data.GenericRowData;
import org.apache.flink.table.data.RowData;
import org.apache.flink.table.data.StringData;
import org.apache.iceberg.*;
import org.apache.iceberg.catalog.TableIdentifier;
import org.apache.iceberg.flink.TableLoader;
import org.apache.iceberg.flink.sink.FlinkSink;
import org.apache.iceberg.hadoop.HadoopCatalog;
import org.apache.iceberg.types.Types;

import java.util.Map;

/**
 * Created by Administrator on 2024/2/3 0003.
 */
public class KafkaToIceberg {

    public static void main(String[] args) throws Exception {


        System.setProperty("hadoop.home.dir", "D:\\aaa\\hadoop-2.7.6\\hadoop-2.7.6");
        //必须要设置,否则spark会写hive会报HDFS权限问题
        System.setProperty("HADOOP_USER_NAME", "root");

        Configuration conf = new Configuration();
        //设置WebUI绑定的本地端口
        conf.setString(RestOptions.BIND_PORT, "8086");

        //        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment(conf);
        StreamExecutionEnvironment env = StreamExecutionEnvironment.createLocalEnvironmentWithWebUI(conf);
        //        StreamTableEnvironment tblEnv = StreamTableEnvironment.create(env);
        env.enableCheckpointing(2000);
        env.getCheckpointConfig().setCheckpointStorage("file:///D:\\Program\\Flink-Project\\Flink-Iceberg\\checkpoint");
        env.disableOperatorChaining();

        String bootStrapServer = "hadoop1:9092,hadoop2:9092,hadoop3:9092";
        KafkaSource<String> kafkaSource = KafkaSource.<String>builder()
        .setBootstrapServers(bootStrapServer)
        .setTopics("mytopic")
        .setGroupId("my-group-id-1")
        .setStartingOffsets(OffsetsInitializer.latest())
        .setValueOnlyDeserializer(new SimpleStringSchema())
        .build();
        DataStreamSource<String> kafkaDS = env.fromSource(kafkaSource, WatermarkStrategy.noWatermarks(), "kafkaSource");

        SingleOutputStreamOperator<RowData> mapDS = kafkaDS.map(new MapFunction<String, RowData>() {
            @Override
            public RowData map(String line) throws Exception {
                String[] split = line.split(",");
                GenericRowData row = new GenericRowData(4);
                row.setField(0, Integer.valueOf(split[0]));
                row.setField(1, StringData.fromString(split[1]));
                row.setField(2, Integer.valueOf(split[2]));
                row.setField(3, StringData.fromString(split[3]));
                return row;
            }
        });

        org.apache.hadoop.conf.Configuration config = new org.apache.hadoop.conf.Configuration();
        HadoopCatalog catalog = new HadoopCatalog(config, "hdfs://hadoop1:9098/warehouse/flinkiceberg");
        //配置iceberg 库名和表名
        TableIdentifier name = TableIdentifier.of("icebergdb", "flink_iceberg_tbl1");
        //创建Icebeng表Schema
        Schema schema = new Schema(
            Types.NestedField.required(1, "id", Types.IntegerType.get()),
            Types.NestedField.required(2, "nane", Types.StringType.get()),
            Types.NestedField.required(3, "age", Types.IntegerType.get()),
            Types.NestedField.required(4, "loc", Types.StringType.get()));
        //如果有分区指定对应分区，这里“loc”列为分区列，可以指定unpartitioned 方法不设置表分区
        //        PartitionSpec spec = PartitionSpec.unpartitioned();
        PartitionSpec spec = PartitionSpec.builderFor(schema).identity("loc").build();
        Map<String, String> props =
        ImmutableMap.of(TableProperties.DEFAULT_FILE_FORMAT, FileFormat.PARQUET.name());
        Table table = null;

        // 通过catalog判断表是否存在，不存在就创建，存在就加载
        if (!catalog.tableExists(name)) {
            table = catalog.createTable(name, schema, spec, props);
        }else {
            table = catalog.loadTable(name);
        }

        mapDS.addSink(new PrintSinkFunction<>());
        TableLoader tableLoader = TableLoader.fromHadoopTable("hdfs://hadoop1:9098/warehouse/flinkiceberg/iceberg_db/flink_iceberg_tbl1", config);

        //5.通过DataStream Api 向Iceberg中写入数据
        FlinkSink.forRowData(mapDS)
        //这个 .table 也可以不写，指定tableLoader 对应的路径就可以。
        //                .table(table)
        .tableLoader(tableLoader)
        //默认为false,追加数据。如果设置为true 就是覆盖数据
        .overwrite(false)
        .append();

        kafkaDS.name("KafkaSource").addSink(new PrintSinkFunction<>());

        env.execute();


    }
}

```

Kafka样例数据

```java
[root@node1 bin]#bin//kafka-console-producer.sh  --topic mytopic --broker-list hadoop1:9092,hadoop2:9092,hadoop3:9092
1,zs,18,beijing
2,ls,19,shanghai
3,ww,20,beijing
4,ml,21,shanghai
```

### SQL API 操作

#### 批量读取表

```java
System.setProperty("hadoop.home.dir", "D:\\aaa\\hadoop-2.7.6\\hadoop-2.7.6");
//必须要设置,否则spark会写hive会报HDFS权限问题
System.setProperty("HADOOP_USER_NAME", "root");

StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
StreamTableEnvironment tblEnv = StreamTableEnvironment.create(env);

env.enableCheckpointing(1000);

//1.创建Catalog
tblEnv.executeSql("CREATE CATALOG hadoop_iceberg WITH (" +
                  "'type'='iceberg'," +
                  "'catalog-type'='hadoop'," +
                  "'warehouse'='hdfs://hadoop1:9098/warehouse/flinkiceberg')");


TableResult tableResult = tblEnv.executeSql("select * from hadoop_iceberg.iceberg_db.flink_iceberg_tbl2");

tableResult.print();;
```

#### 实时读取表

```java
package com.daiyutage.flink.iceberg;

import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.TableResult;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;

/**
 * Created by Administrator on 2024/2/3 0003.
 */
public class FlinkSqlIceberg2 {

    public static void main(String[] args) {

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        StreamTableEnvironment tblEnv = StreamTableEnvironment.create(env);

        env.enableCheckpointing(1000);

        Configuration configuration = tblEnv.getConfig().getConfiguration();
        // 支持SQL语法中的 OPTIONS 选项
        configuration.setBoolean("table.dynamic-table-options.enabled", true);

        //1.创建Catalog
        tblEnv.executeSql("CREATE CATALOG hadoop_iceberg WITH (" +
                          "'type'='iceberg'," +
                          "'catalog-type'='hadoop'," +
                          "'warehouse'='hdfs://hadoop1:9098/warehouse/flinkiceberg')");

        //2.从Iceberg表当前快照读取所有数据，并继续增量读取数据
        // streaming指定为true支持实时读取数据，monitor_interval 监控数据的间隔，默认1s
        TableResult tableResult = tblEnv.executeSql("select * from hadoop_iceberg.iceberg_db.flink_iceberg_tbl2 /*+ OPTIONS('streaming'='true', 'monitor-interval'='1s')*/");
        tableResult.print();
        ;
    }
}

```

#### 读取Kafka写入表

实时消费Kafka数据，然后写入Iceberg表

```java
package com.daiyutage.flink.iceberg;

import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.TableResult;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;

/**
 * Created by Administrator on 2024/2/3 0003.
 */
public class FlinkSqlToIceberg {

    public static void main(String[] args) {
        /**
         * 实时消费kafka数据写入Iceberg表
         */

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        StreamTableEnvironment tblEnv = StreamTableEnvironment.create(env);

        env.enableCheckpointing(5000);

        Configuration configuration = tblEnv.getConfig().getConfiguration();
        // 支持SQL语法中的 OPTIONS 选项
        configuration.setBoolean("table.dynamic-table-options.enabled", true);

        //1.创建Catalog
        tblEnv.executeSql("CREATE CATALOG hadoop_iceberg WITH (" +
                          "'type'='iceberg'," +
                          "'catalog-type'='hadoop'," +
                          "'warehouse'='hdfs://hadoop1:9098/warehouse/flinkiceberg')");
        //3.创建 Kafka Connector,连接消费Kafka中数据
        tblEnv.executeSql("create table kafka_input_table(" +
                          " id int," +
                          " name varchar," +
                          " age int," +
                          " loc varchar" +
                          ") with (" +
                          " 'connector' = 'kafka'," +
                          " 'topic' = 'mytopic'," +
                          " 'properties.bootstrap.servers'='hadoop1:9092,hadoop2:9092,hadoop3:9092'," +
                          " 'scan.startup.mode'='latest-offset'," +
                          " 'properties.group.id' = 'my-group-id'," +
                          " 'format' = 'csv'" +
                          ")");

        TableResult tableResult = tblEnv.executeSql("select * from kafka_input_table");
        tableResult.print();;

    }
}

```