---
custom_edit_url: null
---
### 请简述Zookeeper的选举机制

####  服务器启动时期选举

假设想在的有三台机器搭建集群，在集群初始化阶段，当只有一个服务器（Server1）启动时，无法完成Leader的选举；当第二台服务器（Server2）启动后，两台机器开始互相通信，每台机器都会尝试去选举Leader，于是进入了Leader选举过程，这个过程大概如下：

1. **每个Server发出一个投票投给自己**。在初始情况下，Server1和Server2都会将自己作为Leader，将票投给自己。每次投票会包含所推举的服务器的myid和ZXID，使用（myid，ZXID）来表示，此时Server1的投票为(1, 0)，Server2的投票为(2, 0)，然后各自将这个投票发给集群中的其他机器；
2. 接受来自各个服务器的投票。集群的每个服务器收到投票后，首先判断该投票是否有效，如检查是否是本轮投票、是否来自LOOKING状态的服务器；
3. 处理投票。针对每一个投票，服务器都需要将别人的投票和自己的投票进行PK，PK的规则如下： 对于Server1而言，它的投票是(1, 0)，接收Server2的投票为(2, 0)，首先会比较两者的ZXID，均为0，再比较myid，此时Server2的myid最大，于是更新自己的投票为(2, 0)，然后重新投票，对于Server2而言，其无须更新自己的投票，只是再次向集群中所有机器发出上一次投票信息即可。
   1. 优先检查ZXID。ZXID比较大的服务器优先作为Leader；
   2. 如果ZXID相同，那么就比较myid。myid较大的服务器作为Leader服务器。
4. **统计投票**。每次投票后，服务器都会统计投票信息，判断是否已经过半机器接收到相同的投票信息，对于Server1、Server2而言，都统计出集群中已经有两台机器接受了(2, 0)的投票信息，此时便认为已经选出了Leader。
5. **改变服务器状态**。一旦确定了Leader，每个服务器都会更新自己的状态，如果是Follower，那么就变更为FOLLOWING，如果是Leader，就变更为LEADING。

#### 服务器运行期间的 Leader 选举

在Zookeeper运行期间，即便有新服务器加入，也不会影响到Leader，新加入的服务器会将原有的Leader服务器视为Leader，进行同步。但是一旦Leader宕机了，那么整个集群就将暂停对外服务，进行新一轮Leader的选举，其过程和启动时期的Leader选举过程基本一致。假设正在运行的有Server1、Server2、Server3三台服务器，当前Leader是Server2，若某一时刻Leader挂了，此时便开始Leader选举。选举过程如下：

1. 变更状态。Leader宕机后，余下的非Observer服务器都会将自己的服务器状态变更为LOOKING，然后开始进行Leader选举流程；
2. **每个Server会发出一个投票**。在这个过程中，需要生成投票信息(myid,ZXID)每个服务器上的ZXID可能不同，我们假定Server1的ZXID为123，而Server3的ZXID为122；在第一轮投票中，Server1和Server3都会投自己，产生投票(1, 123)，(3, 122)，然后各自将投票发送给集群中所有机器；
3. 接收来自各个服务器的投票。与启动时过程相同；
4. 处理投票；
5. 统计投票；
6. 改变服务器的状态

### 谈谈你对ZooKeeper的理解

 Zookeeper 作为一个分布式的服务框架，主要用来解决分布式集群中应用系统的一致性问题。ZooKeeper提供的服务包括：分布式消息同步和协调机制、 服务器节点动态上下线、统一配置管理、负载均衡、集群管理等。
  ZooKeeper提供基于类似于Linux文件系统的目录节点树方式的数据存储，即分层命名空间。Zookeeper 并不是用来专门存储数据的， 它的作用主要是用来维护和监控你存储的数据的状态变化，通过监控这些数据状态的变化，从而可以达到基于数据的集群管理，ZooKeeper节点的数据上限是1MB。
  我们可以认为Zookeeper=文件系统+通知机制，对于ZooKeeper的数据结构，每个子目录项如 NameService 都被称作为 znode，这个 znode 是被它所在的 路径唯一标识，如 Server1 这个 znode 的标识为 /NameService/Server1；
  znode 可以有子节点目录，并且每个 znode 可以存储数据，注意 EPHEMERAL 类型的目录节点不能有子节点目录(因为它是临时节点)；
  znode 是有版本的，每个 znode 中存储的数据可以有多个版本，也就是一个访问路径中可以存储多份数据；
  znode 可以是临时节点，一旦创建这个 znode 的客户端与服务器失去联系，这个 znode 也将自动删除，Zookeeper 的客户端和服务器通信采用长连接方式， 每个客户端和服务器通过心跳来保持连接，这个连接状态称为 session，如果 znode 是临时节点，这个 session 失效，znode 也就删除了；
  znode 的目录名可以自动编号，如 App1 已经存在，再创建的话，将会自动命名为 App2；
  znode 可以被监控，包括这个目录节点中存储的数据的修改，子节点目录的变化等，一旦变化可以通知设置监控的客户端，这个是 Zookeeper 的核心特性， Zookeeper 的很多功能都是基于这个特性实现的，后面在典型的应用场景中会有实例介绍

### ZooKeeper集群中服务器之间是怎样通信的

 Leader服务器会和每一个Follower/Observer服务器都建立TCP连接，同时为每个F/O都创建一个叫做LearnerHandler的实体。 LearnerHandler主要负责Leader和F/O之间的网络通讯，包括数据同步，请求转发和Proposal提议的投票等。Leader服务器保存了所有F/O的LearnerHandler。

### ZooKeeper对节点的watch监听是永久的吗？为什么

不是。官方声明：

>  一个Watch事件是一个一次性的触发器，当被设置了Watch的数据发生了改变的时候，则服务器将这个改变发送给设置了Watch的客户端， 以便通知它们。
>   

为什么不是永久的，举个例子，如果服务端变动频繁，而监听的客户端很多情况下，每次变动都要通知到所有的客户端，这太消耗性能了。
一般是客户端执行getData(“/节点A”,true)，如果节点A发生了变更或删除，客户端会得到它的watch事件，但是在之后节点A又发生了变更， 而客户端又没有设置watch事件，就不再给客户端发送。
在实际应用中，很多情况下，我们的客户端不需要知道服务端的每一次变动，我只要最新的数据即可

### 一个客户端修改了某个节点的数据，其他客户端能够马上获取到这个最新数据吗

 ZooKeeper不能确保任何客户端能够获取（即Read Request）到一样的数据，除非客户端自己要求，方法是客户端在获取数据之前调用 org.apache.zookeeper.AsyncCallbac k.VoidCallback, java.lang.Object) sync。
通常情况下（这里所说的通常情况满足：1. 对获取的数据是否是最新版本不敏感，2. 一个客户端修改了数据，其它客户端是否需要立即能够获取最新数据）， 可以不关心这点。
在其它情况下，最清晰的场景是这样：ZK客户端A对 /my_test 的内容从 v1->v2, 但是ZK客户端B对 /my_test 的内容获取，依然得到的是 v1. 请注意， 这个是实际存在的现象，当然延时很短。**解决的方法是客户端B先调用 sync(), 再调用 getData()**

### ZooKeeper中使用watch的注意事项有哪些

 使用watch需要注意的几点：

1. Watches通知是一次性的，必须重复注册。
2. 发生CONNECTIONLOSS之后，只要在session_timeout之内再次连接上（即不发生SESSIONEXPIRED），那么这个连接注册的watches依然在。
3. 节点数据的版本变化会触发NodeDataChanged，注意，这里特意说明了是版本变化。存在这样的情况，只要成功执行了setData()方法， 无论内容是否和之前一致，都会触发NodeDataChanged。
4. 对某个节点注册了watch，但是节点被删除了，那么注册在这个节点上的watches都会被移除。
5. 同一个zk客户端对某一个节点注册相同的watch，只会收到一次通知。
6. Watcher对象只会保存在客户端，不会传递到服务端

### 能否收到每次节点变化的通知

如果节点数据的更新频率很高的话，不能。
原因在于：当一次数据修改，通知客户端，客户端再次注册watch，在这个过程中，可能数据已经发生了许多次数据修改，因此， 千万不要做这样的测试：”数据被修改了n次，一定会收到n次通知”来测试server是否正常工作

### ZooKeeper节点类型

> Znode有两种类型

* 短暂（ephemeral）：客户端和服务器端断开连接后，创建的节点自己删除。
* 持久（persistent）：客户端和服务器端断开连接后，创建的节点不删除。

>  Znode有四种形式的目录节点（默认是persistent ）

1. 持久化目录节点（PERSISTENT） 客户端与zookeeper断开连接后，该节点依旧存在。
2. 持久化顺序编号目录节点（PERSISTENT_SEQUENTIAL） 客户端与zookeeper断开连接后，该节点依旧存在， 只是Zookeeper给该节点名称进行顺序编号。
3. 临时目录节点（EPHEMERAL） 客户端与zookeeper断开连接后，该节点被删除。
4. 临时顺序编号目录节点（EPHEMERAL_SEQUENTIAL）客户端与zookeeper断开连接后，该节点被删除，只是Zookeeper给该节点名称进行顺序编号。

### 请说明ZooKeeper的通知机制

ZooKeeper选择了基于通知（notification）的机制，即：客户端向ZooKeeper注册需要接受通知的znode，通过znode设置监控点（watch）来接受通知。 监视点是一个单次触发的操作，意即监视点会触发一个通知。为了接收多个通知，客户端必须在每次通知后设置一个新的监视点。在下图阐述的情况下， 当节点/task发生变化时，客户端会受到一个通知，并从ZooKeeper读取一个新值。

![img](https://github.com/Dr11ft/BigDataGuide/raw/master/Pics/ZK%E9%9D%A2%E8%AF%95%E9%A2%98Pics/ZK%E9%80%9A%E7%9F%A5%E6%9C%BA%E5%88%B6.png)

### ZooKeeper的监听原理是什么

在应用程序中，mian()方法首先会创建zkClient，创建zkClient的同时就会产生两个进程，即Listener进程（监听进程）和 connect进程（网络连接/传输进程），当zkClient调用getChildren()等方法注册监视器时，connect进程向ZooKeeper注册监听器， 注册后的监听器位于ZooKeeper的监听器列表中，监听器列表中记录了zkClient的IP，端口号以及要监控的路径，一旦目标文件发生变化， ZooKeeper就会把这条消息发送给对应的zkClient的Listener()进程，Listener进程接收到后，就会执行process()方法， 在process()方法中针对发生的事件进行处理

![img](https://github.com/Dr11ft/BigDataGuide/raw/master/Pics/ZK%E9%9D%A2%E8%AF%95%E9%A2%98Pics/ZK%E7%9B%91%E5%90%AC%E5%8E%9F%E7%90%86.png)

### ZooKeeper的部署方式有哪几种

ZooKeeper的部署方式有单机模式和集群模式

### 集群最少需要几台机器

集群中的角色有Leader和Follower，集群最少3（2N+1）台，根据选举算法，应保证奇数。

### ZooKeeper使用的ZAB协议与Paxo算法的异同

 Paxos算法是分布式选举算法，Zookeeper使用的 ZAB协议（Zookeeper原子广播），两者的异同如下：

* 相同之处：比如都有一个Leader，用来协调N个Follower的运行；Leader要等待超半数的Follower做出正确反馈之后才进行提案； 二者都有一个值来代表Leader的周期。
* 不同之处：ZAB用来构建高可用的分布式数据主备系统（Zookeeper），Paxos是用来构建分布式一致性状态机系统

### 请谈谈对ZooKeeper对事务性的支持

ZooKeeper对于事务性的支持主要依赖于四个函数，zoo_create_op_init， zoo_delete_op_init， zoo_set_op_init以及zoo_check_op_init。 每一个函数都会在客户端初始化一个operation，客户端程序有义务保留这些operations。当准备好一个事务中的所有操作后，可以使用zoo_multi来提交所有的操作， 由zookeeper服务来保证这一系列操作的原子性。也就是说只要其中有一个操作失败了，相当于此次提交的任何一个操作都没有对服务端的数据造成影响。 Zoo_multi的返回值是第一个失败操作的状态信号

### ZooKeeper是否支持动态进行机器扩容？如果目前不支持，那么要如何扩容呢

 ZooKeeper中的动态扩容其实就是水平扩容，Zookeeper对这方面的支持不太好，目前有两种方式：
  全部重启：关闭所有Zookeeper服务，修改配置之后启动，不影响之前客户端的会话。
  逐个重启：这是比较常用的方式。

### 如何用zk实现分布式锁

实现基于ZooKeeper的分布式锁通常遵循以下步骤：

1. **在ZooKeeper中创建一个持久性节点（Persistent Node）**：这个节点将用作锁的根节点。
2. **当一个节点需要获取锁时**：
   - 节点在ZooKeeper中创建一个临时顺序节点（Ephemeral Sequential Node）。
   - 节点获取所有与锁相关的子节点列表，并监视前一个节点。
   - 如果这个节点是所有子节点中最小的节点（即序号最小），则表示它获取到了锁。
3. **当一个节点需要释放锁时**：
   - 节点删除自己创建的临时节点。

通过这种方式，只有一个节点能够成功创建最小的临时顺序节点，从而实现了分布式锁的互斥访问。

需要注意的是，基于ZooKeeper实现的分布式锁可能存在一些问题，例如单点故障、性能瓶颈等。因此，在实际应用中，需要仔细考虑这些问题，并根据具体情况选择合适的分布式锁方案。

另外，现在也有一些基于ZooKeeper的高级分布式锁实现，如Curator框架提供了一些高级的分布式锁实现，可以简化开发和提高性能。

Curator是一个Apache ZooKeeper的Java客户端库，提供了一些高级的抽象和工具，简化了与ZooKeeper的交互。Curator中包含了一种叫做`InterProcessMutex`的分布式锁实现，用于在分布式环境中实现互斥访问共享资源。

以下是使用Curator实现分布式锁的基本步骤：

1. **创建Curator客户端**：首先需要创建一个Curator客户端来连接ZooKeeper集群。

```java
CuratorFramework client = CuratorFrameworkFactory.newClient(connectString, new ExponentialBackoffRetry(1000, 3));
client.start();
```

2. **使用`InterProcessMutex`创建分布式锁**：利用`InterProcessMutex`对象来创建分布式锁。

```java
InterProcessMutex lock = new InterProcessMutex(client, "/your-lock-path");
```

3. **获取锁**：在需要获取锁的地方调用`acquire()`方法来获取锁。

```java
try {
    lock.acquire();
    // 执行需要保护的临界区代码
} finally {
    lock.release();
}
```

4. **释放锁**：在完成临界区代码的执行后，一定要记得调用`release()`方法来释放锁。

通过Curator提供的`InterProcessMutex`实现分布式锁，可以避免手动处理ZooKeeper节点的创建、监视和删除等操作，简化了分布式锁的实现过程。同时，Curator还提供了其他一些功能丰富的分布式协调工具，如分布式计数器、分布式Barrier等，可以帮助开发人员更方便地在分布式环境中实现各种协调任务。