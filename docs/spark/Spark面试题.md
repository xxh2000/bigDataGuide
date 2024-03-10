---
sidebar_position: 2
---
## Spark Core
#### 1. Spark为什么比mapreduce快？为什么快呢？ 快在哪里呢？

Spark计算比MapReduce快的根本原因在于DAG计算模型。一般而言，DAG相比Hadoop的MapReduce在大多数情况下可以减少shuffle次数**
Spark的DAGScheduler相当于一个改进版的MapReduce，如果计算不涉及与其他节点进行数据交换，Spark可以在内存中一次性完成这些操作，也就是中间结果无须落盘，减少了磁盘IO的操作。但是，如果计算过程中涉及数据交换，Spark也是会把shuffle的数据写磁盘的！！！
有同学提到，Spark是基于内存的计算，所以快，这也不是主要原因，要对数据做计算，必然得加载到内存，Hadoop也是如此，只不过Spark支持将需要反复用到的数据给Cache到内存中，减少数据加载耗时，所以Spark跑机器学习算法比较在行（需要对数据进行反复迭代）。Spark基于磁盘的计算依然也是比Hadoop快。
刚刚提到了Spark的DAGScheduler是个改进版的MapReduce，所以Spark天生适合做批处理的任务。而不是某些同学说的：Hadoop更适合做批处理，Spark更适合做需要反复迭代的计算。
Hadoop的MapReduce相比Spark真是没啥优势了。但是Hadoop的HDFS还是业界的大数据存储标准。

#### 2.Spark和MR的区别？ 

Spark vs MapReduce ≠ 内存 vs 磁盘

其实Spark和MapReduce的计算都发生在内存中，区别在于：
MapReduce通常需要将计算的中间结果写入磁盘，然后还要读取磁盘，从而导致了频繁的磁盘IO。
Spark则不需要将计算的中间结果写入磁盘，这得益于Spark的RDD（弹性分布式数据集，很强大）和DAG（有向无环图），其中DAG记录了job的stage以及在job执行过程中父RDD和子RDD之间的依赖关系。中间结果能够以RDD的形式存放在内存中，且能够从DAG中恢复，大大减少了磁盘IO。

#### 3.Mapreduce和Spark的都是并行计算，那么他们有什么相同和区别

MapReduce和Spark都是用于并行计算的框架。

相同点：
* 并行计算：两者都支持将大规模的数据集划分为多个小任务，并在分布式环境中并行执行这些任务。
* 可扩展性：它们都可以在大规模集群上运行，通过添加更多的计算节点来扩展计算能力。
* 容错性：它们都具备故障恢复机制，能够处理计算节点的故障，并保证计算的正确性。

区别：
* 内存使用：MapReduce将中间数据写入磁盘，而Spark将中间数据存储在内存中，这使得Spark在某些情况下比MapReduce更快，尤其是对于迭代计算和交互式查询等需要多次读写数据的场景。
* 数据处理模型：MapReduce采用了经典的"map"和"reduce"操作模型，而Spark引入了更多的数据处理操作，如过滤、排序、连接等，使得编写数据处理逻辑更加灵活。
* 实时计算支持：Spark提供了实时流处理功能，可以对数据进行实时处理和分析，而MapReduce主要用于离线批处理。
* 编程接口：MapReduce使用Java编程接口，而Spark支持多种编程语言接口，包括Java、Scala、Python和R，使得开发者可以使用自己熟悉的语言进行开发。

总体而言，Spark相对于MapReduce来说更加灵活和高效，尤其适用于需要实时计算和复杂数据处理的场景。但对于一些传统的离线批处理任务，MapReduce仍然是一个可靠的选择。

#### 4.简述Spark中的缓存机制与checkpoint机制，说明两者的区别与联系

两者都是做RDD持久化的

> 一、RDD的缓存机制

RDD通过cache方法或者persist方法可以将前面的计算结果缓存，但并不是立即缓存，而是在接下来调用Action类的算子的时候，该RDD将会被缓存在计算节点的内存中，并供后面使用。它既不是transformation也不是action类的算子。

注意：缓存结束后，不会产生新的RDD

缓存有可能丢失，或者存储存储于内存的数据由于内存不足而被删除，RDD的缓存容错机制保证了即使缓存丢失也能保证计算的正确执行。通过基于RDD的一系列转换，丢失的数据会被重算，由于RDD的各个Partition是相对独立的，因此只需要计算丢失的部分即可，并不需要重算全部Partition。

使用缓存的条件：（或者说什么时候进行缓存）

要求的计算速度快，对效率要求高的时候
集群的资源要足够大，能容得下要被缓存的数据
被缓存的数据会多次的触发Action（多次调用Action类的算子）
先进行过滤，然后将缩小范围后的数据缓存到内存中
在使用完数据之后，要释放缓存，否则会一直在内存中占用资源

> 二、CheckPoint机制（容错机制）

RDD的缓存容错机制能保证数据丢失也能正常的运行，是因为在每一个RDD中，都存有上一个RDD的信息，当RDD丢失以后，可以追溯到元数据，再进行计算

检查点（本质是通过将RDD写入高可用的地方（例如 hdfs）做检查点）是为了通过lineage（血统）做容错的辅助，lineage过长会造成容错成本过高，这样就不如在中间阶段做检查点容错，如果之后有节点出现问题而丢失分区，从做检查点的RDD开始重做Lineage，就会减少开销

设置checkpoint的目录，可以是本地的文件夹、也可以是HDFS。一般是在具有容错能力，高可靠的文件系统上(比如HDFS, S3等)设置一个检查点路径，用于保存检查点数据

在设置检查点之后，该RDD之前的有依赖关系的父RDD都会被销毁，下次调用的时候直接从检查点开始计算。
checkPoint和cache一样，都是通过调用一个Action类的算子才能运行

**区别与联系：**

区别：

缓存机制是将数据存储在内存中，以提高数据访问速度；而Checkpoint机制是将数据持久化到磁盘，以提高容错性和长期存储需求。
缓存机制适用于频繁访问的数据，而Checkpoint机制适用于需要可靠持久化的数据。

联系：

Checkpoint操作可以将RDD缓存在磁盘上，从而实现数据的持久化和容错性，类似于缓存机制的一种延伸。
在某些情况下，可以将Checkpoint和缓存机制结合使用，以实现更高效的数据处理和作业执行。

缓存机制和Checkpoint机制在Spark中都扮演着重要的角色，分别用于优化性能和提高容错性。它们在作业执行过程中有着不同的功能和应用场景，开发人员可以根据具体需求选择合适的机制来提升Spark作业的效率和可靠性

#### 5.Spark算子可分为那两类，这两类算子的区别是什么?

Spark的算子可以分为两类：Transformation、Action

Transformation：从现有的数据集创建一个新的数据集，返回一个新的 RDD 操作。Transformation都是惰性的，它们并不会立刻执行，只是记住了这些应用到 RDD 上的转换动作
Action：触发在 RDD 上的计算，这些计算可以是向应用程序返回结果，也可以是向存储系统保存数据
Transformation 最重要的特点：延迟执行、返回 RDD

Action最重要的特点：触发 Job ，返回的结果一定不是 RDD

常见的 Transformation 包括：map、mapVaules、filter、flatMap、mapPartitions、uoin、join、distinct、xxxByKey
常见的 Action 包括：count、collect、collectAsMap、first、reduce、fold、aggregate、saveAsTextFile
有Shuffle的 Transformation 包括：

一堆的 xxxByKey（sortBykey、groupByKey、reduceByKey、foldByKey、aggrea geByKey、combineByKey）。备注：不包括countByKey
join相关（join、leftOuterJoin、rightOuterJoin、fullOuterJoin、cogroup）
distinct、intersection、subtract、partionBy、repartition


## Spark Sql
#### 1. 说说RDD、DataFrame、DataSet三者的区别与联系
一、RDD
RDD叫做弹性分布式数据集，是Spark中最基本的数据处理模型。代码中是一个抽象类，它代表了一个弹性的、不可变的、可分区、里面的元素可进行计算的集合

RDD封装了计算逻辑，并不保存数据；RDD是一个抽象类，需要子类具体实现；RDD封装了计算逻辑，是不可以改变的，想要改变，只能产生新的RDD，在新的RDD里面封装计算逻辑；可分区、并行计算

二、DataFrame
DataFrame是一种以RDD为基础的分布式数据集，类似于传统数据库中的二维表格

三、RDD与DataFrame的区别
两者均为懒执行

DataFrame
带有schema元信息，即 DataFrame 所表示的二维表数据集的每一列都带有名称和类型，便于Spark SQL的操作
支持嵌套数据类型（struct、array和Map），从易用性来说，DataFrame提供的是一套高层的关系操作，比函数式的RDD API更加友好
因为优化的查询执行计划，导致DataFrame执行效率优于RDD
RDD
无法得到所存数据元素的具体结构，SparkCore只能在Stage层面进行简单、通用的流水线优化
操作门槛高

四、DataSet
DataSet是分布式数据集，是DataFrame的一个扩展。提供了RDD的优势（强类型）以及Spark SQL优化执行引擎的优点

DataFrame是DataSet的特例：DataFrame=DataSet[Row]，

## SparkStreaming
