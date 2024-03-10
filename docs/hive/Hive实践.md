## 排名函数
### ROW_NUMBER()
给定一个分区内的行一个唯一的整数排名，按照记录的排序顺序。示例：
```hiveql
SELECT
  column1,
  column2,
  ROW_NUMBER() OVER (PARTITION BY partition_column ORDER BY order_column) AS rank
FROM
  table_name;

```

### RANK()
为分区内的行分配一个排名，如果有相等的值，则将它们分配相同的排名，有相同排名，但会跳过占用的排名。示例：
```hiveql
SELECT
  column1,
  column2,
  RANK() OVER (PARTITION BY partition_column ORDER BY order_column) AS rank
FROM
  table_name;

```
### DENSE_RANK()
DENSE意思为稠密的，即序号是连续的。为分区内的行分配一个排名，如果有相等的值，则将它们分配相同的排名，但不跳过后续的排名。示例：
```hiveql
SELECT
  column1,
  column2,
  DENSE_RANK() OVER (PARTITION BY partition_column ORDER BY order_column) AS rank
FROM
  table_name;

```
## 排序
### Order By
全局排序。在 Hive 中，ORDER BY 保证数据的全局有序，为此将所有的数据发送到一个 Reducer 中。因为只有一个 Reducer，所以当输入规模较大时，需要较长的计算时间。Hive 中的 ORDER BY 语法与 SQL 中 ORDER BY 的语法相似，按照某一项或者几项排序输出，可以指定是升序或者是降序排序。

**limit限制**

在严格模式下，即 hive.mapred.mode = strict，ORDER BY 子句后面必须跟一个 LIMIT 子句。如果将 hive.mapred.mode 设置为 nonstrict，可以不用 LIMIT 子句。原因是为了实现所有数据的全局有序，只能使用一个 reducer 来对最终输出进行排序。如果输出中的行数太大，单个 Reducer 可能需要很长时间才能完成。如果在严格模式不指定 LIMIT 子句，会报错。SemanticException 1:106 Order by-s without limit are disabled for safety reasons

### Sort By
分区内排序。不是全局排序，其在数据进入reducer前完成排序，也就是说它会在数据进入reduce之前为每个reducer都产生一个排序后的文件。因此，如果用sort by进行排序，并且设置mapreduce.job.reduces>1，则sort by只保证每个reducer的输出有序，不保证全局有序

### distribute by
数据分发。distribute by是控制在map端如何拆分数据给reduce端的。类似于MapReduce中分区partationer对数据进行分区。hive会根据distribute by后面列，将数据分发给对应的reducer，默认是采用hash算法+取余数的方式。在Mapreduce程序中，进行HashPartition的key是读取输入文件的每行的一个起始位置(单位是字节)，“值”是本行的文本内容。
sort by为每个reduce产生一个排序文件，在有些情况下，你需要控制某写特定的行应该到哪个reducer，这通常是为了进行后续的聚集操作。distribute by刚好可以做这件事。因此，distribute by经常和sort by配合使用。
### cluster by
cluster by除了具有distribute by的功能外还兼具sort by的功能。但是排序只能是升序排序，不能指定排序规则为ASC或者DESC。
当分区字段和排序字段相同cluster by可以简化distribute by+sort by 的SQL 写法，也就是说当distribute by和sort by 字段相同时，可以使用cluster by 代替distribute by和sort by