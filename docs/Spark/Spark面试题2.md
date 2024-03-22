---
sidebar_position: 2
custom_edit_url: null
---
## Spark Core

### RDD的数据结构是怎么样的

一个RDD对象，包含如下5个核心属性。

1. 一个分区列表，每个分区里是RDD的部分数据（或称数据块）。
2. 一个依赖列表，存储依赖的其他RDD。
3. 一个名为compute的计算函数，用于计算RDD各分区的值。
4. 分区器（可选），用于键/值类型的RDD，比如某个RDD是按散列来分区。
5. 计算各分区时优先的位置列表（可选），比如从HDFS上的文件生成RDD时，RDD分区的位置优先选择数据所在的节点，这样可以避免数据移动带来的开销。

### 什么是RDD宽依赖和窄依赖

 RDD和它依赖的parent RDD(s)的关系有两种不同的类型，即窄依赖（narrow dependency）和宽依赖（wide dependency）

1. 窄依赖指的是每一个parent RDD的Partition最多被子RDD的一个Partition使用
2. 宽依赖指的是多个子RDD的Partition会依赖同一个parent RDD的Partition

### Spark累加器有哪些特点？

1. 累加器在全局唯一的，只增不减，记录全局集群的唯一状态；
2. 在executor中修改它，在driver读取；
3. executor级别共享的，广播变量是task级别的共享两个application不可以共享累加器，但是同一个app不同的job可以共享

### Spark hashParitioner的弊端是什么

  HashPartitioner分区的原理很简单，对于给定的key，计算其hashCode，并除于分区的个数取余，如果余数小于0，则用余数+分区的个数，最后返回的值就是 这个key所属的分区ID；弊端是数据不均匀，容易导致数据倾斜，极端情况下某几个分区会拥有rdd的所有数据。

### RangePartitioner分区的原理

RangePartitioner分区则尽量保证每个分区中数据量的均匀，而且分区与分区之间是有序的，也就是说一个分区中的元素肯定都是比另一个分区内的元素小 或者大；但是分区内的元素是不能保证顺序的。简单的说就是将一定范围内的数映射到某一个分区内。其原理是水塘抽样

### RangePartioner分区器特点

RangePartioner尽量保证每个分区中数据量的均匀，而且分区与分区之间是有序的，一个分区中的元素肯定都是比另一个分区内的元素小或者大； 但是分区内的元素是不能保证顺序的。简单的说就是将一定范围内的数映射到某一个分区内。RangePartitioner作用：将一定范围内的数映射到某一个分区内， 在实现中，分界的算法尤为重要。算法对应的函数是rangeBounds

### union操作是产生宽依赖还是窄依赖

产生窄依赖

### 窄依赖父RDD的partition和子RDD的parition是不是都是一对一的关系？

不一定，除了一对一的窄依赖，还包含一对固定个数的窄依赖（就是对父RDD的依赖的Partition的数量不会随着RDD数量规模的改变而改变）， 比如join操作的每个partiion仅仅和已知的partition进行join，这个join操作是窄依赖，依赖固定数量的父rdd，因为是确定的partition关系。

### Spark中Worker的主要工作是什么

管理当前节点内存，CPU的使用状况，接收master分配过来的资源指令，通过ExecutorRunner启动程序分配任务，worker就类似于包工头， 管理分配新进程，做计算的服务，相当于process服务。
需要注意的是：

1. worker会不会汇报当前信息给master，worker心跳给master主要只有workid，它不会发送资源信息以心跳的方式给mater，master分配的时候就知道work， 只有出现故障的时候才会发送资源。
2. worker不会运行代码，具体运行的是Executor是可以运行具体appliaction写的业务逻辑代码，操作代码的节点，它不会运行程序的代码的。

### Spark中的HashShufle的有哪些不足

1. shuffle产生海量的小文件在磁盘上，此时会产生大量耗时的、低效的IO操作；
2. 容易导致内存不够用，由于内存需要保存海量的文件操作句柄和临时缓存信息，如果数据处理规模比较大的话，容易出现OOM；
3. 容易出现数据倾斜，导致OOM。

### conslidate是如何优化Hash shuffle时在map端产生的小文件

1. conslidate为了解决Hash Shuffle同时打开过多文件导致Writer handler内存使用过大以及产生过多文件导致大量的随机读写带来的低效磁盘IO；
2. conslidate根据CPU的个数来决定每个task shuffle map端产生多少个文件，假设原来有10个task，100个reduce，每个CPU有10个CPU，那么 使用hash shuffle会产生10*100=1000个文件，conslidate产生10*10=100个文件

注意：conslidate部分减少了文件和文件句柄，并行读很高的情况下（task很多时）还是会很多文件。

### spark.default.parallelism这个参数有什么意义

1. 参数用于设置每个stage的默认task数量。这个参数极为重要，如果不设置可能会直接影响你的Spark作业性能；
2. 很多人都不会设置这个参数，会使得集群非常低效，你的cpu，内存再多，如果task始终为1，那也是浪费， spark官网建议task个数为CPU的核数*executor的个数的2~3倍。
