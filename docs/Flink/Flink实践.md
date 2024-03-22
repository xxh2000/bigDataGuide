---
custom_edit_url: null
---

## Flink SQL 窗口

窗口是处理无限流的核心。窗口把流分割为有限大小的 “桶”，这样就可以在其之上进行计算。本文档聚焦于窗口在 Flink SQL 中是如何工作的，编程人员如何最大化地利用好它。

Apache Flink 提供了如下 `窗口表值函数`（table-valued function, 缩写TVF）把表的数据划分到窗口中：

- [滚动窗口](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/sql/queries/window-tvf/#滚动窗口tumble)
- [滑动窗口](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/sql/queries/window-tvf/#滑动窗口hop)
- [累积窗口](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/sql/queries/window-tvf/#累积窗口cumulate)
- [会话窗口](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/sql/queries/window-tvf/#会话窗口session) (目前仅支持流模式)

注意：逻辑上，每个元素可以应用于一个或多个窗口，这取决于所使用的 `窗口表值函数`。例如：滑动窗口可以把单个元素分配给多个窗口。

`窗口表值函数` 是 Flink 定义的多态表函数（Polymorphic Table Function，缩写PTF），PTF 是 SQL 2016 标准中的一种特殊的表函数，它可以把表作为一个参数。PTF 在对表的重塑上很强大。因为它们的调用出现在 `SELECT` 的 `FROM` 从句里。

`窗口表值函数` 是 [分组窗口函数](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/sql/queries/window-agg/#group-window-aggregation-deprecated) （已经过时）的替代方案。`窗口表值函数` 更符合 SQL 标准，在支持基于窗口的复杂计算上也更强大。例如：窗口 TopN、窗口 Join。而[分组窗口函数](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/sql/queries/window-agg/#group-window-aggregation)只支持窗口聚合

### 窗口表值函数

`窗口表值函数` 是 Flink 定义的多态表函数（Polymorphic Table Function，缩写PTF），PTF 是 SQL 2016 标准中的一种特殊的表函数，它可以把表作为一个参数。PTF 在对表的重塑上很强大。因为它们的调用出现在 `SELECT` 的 `FROM` 从句里。

`窗口表值函数` 是 [分组窗口函数](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/sql/queries/window-agg/#group-window-aggregation-deprecated) （已经过时）的替代方案。`窗口表值函数` 更符合 SQL 标准，在支持基于窗口的复杂计算上也更强大。例如：窗口 TopN、窗口 Join。而[分组窗口函数](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/sql/queries/window-agg/#group-window-aggregation)只支持窗口聚合

### 窗口函数

#### 滚动窗口（TUMBLE）

将每个元素分配到一个指定大小的窗口中。通常，滚动窗口有一个固定的大小，并且不会出现重叠。例如，如果指定了一个5分钟大小的滚动窗口，无限流的数据会根据时间划分为`[0:00 - 0:05)`、`[0:05, 0:10)`、`[0:10, 0:15)`等窗口。下图展示了一个30秒的滚动窗口

![1102.png](..%2F..%2Fstatic%2Fimg%2F1102.png)

使用标识函数选出窗口的起始时间或者结束时间，窗口的时间属性用于下级Window的聚合

| 窗口标识函数                                | 返回类型                | 描述                                                         |
| ------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| `TUMBLE_START(time-attr, size-interval)`    | TIMESTAMP               | 返回窗口的起始时间（包含边界）。例如`[00:10, 00:15)` 窗口，返回`00:10` 。 |
| `TUMBLE_END(time-attr, size-interval)`      | TIMESTAMP               | 返回窗口的结束时间（包含边界）。例如`[00:00, 00:15]`窗口，返回`00:15`。 |
| `TUMBLE_ROWTIME(time-attr, size-interval)`  | TIMESTAMP(rowtime-attr) | 返回窗口的结束时间（不包含边界）。例如`[00:00, 00:15]`窗口，返回`00:14:59.999` 。返回值是一个rowtime attribute，即可以基于该字段做时间属性的操作，例如，级联窗口只能用在基于Event Time的Window上 |
| `TUMBLE_PROCTIME(time-attr, size-interval)` | TIMESTAMP(rowtime-attr) | 返回窗口的结束时间（不包含边界）。例如`[00:00, 00:15]`窗口，返回`00:14:59.999`。返回值是一个proctime attribute，即可以基于该字段做时间属性的操作，例如，级联窗口只能用在基于Processing Time的Window上 |

TUMBLE window示例

```java
import org.apache.flink.api.common.typeinfo.TypeHint;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.api.java.tuple.Tuple3;
import org.apache.flink.streaming.api.TimeCharacteristic;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.timestamps.AscendingTimestampExtractor;
import org.apache.flink.table.api.EnvironmentSettings;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;


import java.sql.Timestamp;
import java.util.Arrays;

public class TumbleWindowExample {

    public static void main(String[] args) throws Exception {

        /**
         * 1 注册环境
         */
        EnvironmentSettings mySetting = EnvironmentSettings
                .newInstance()
//                .useOldPlanner()
                .useBlinkPlanner()
                .inStreamingMode()
                .build();

        // 获取 environment
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        // 指定系统时间概念为 event time
        env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime);

        StreamTableEnvironment tEnv = StreamTableEnvironment.create(env,mySetting);


        // 初始数据
        DataStream<Tuple3<Long, String,Integer>> log = env.fromCollection(Arrays.asList(
                //时间 14:53:00
                new Tuple3<>(1572591180_000L,"xiao_ming",300),
                //时间 14:53:09
                new Tuple3<>(1572591189_000L,"zhang_san",303),
                //时间 14:53:12
                new Tuple3<>(1572591192_000L, "xiao_li",204),
                //时间 14:53:21
                new Tuple3<>(1572591201_000L,"li_si", 208)
                ));

        // 指定时间戳
        SingleOutputStreamOperator<Tuple3<Long, String, Integer>> logWithTime = log.assignTimestampsAndWatermarks(new AscendingTimestampExtractor<Tuple3<Long, String, Integer>>() {

            @Override
            public long extractAscendingTimestamp(Tuple3<Long, String, Integer> element) {
                return element.f0;
            }
        });

        // 转换为 Table
        Table logT = tEnv.fromDataStream(logWithTime, "t.rowtime, name, v");

        Table result = tEnv.sqlQuery("SELECT TUMBLE_START(t, INTERVAL '10' SECOND) AS window_start," +
                "TUMBLE_END(t, INTERVAL '10' SECOND) AS window_end, SUM(v) FROM "
                + logT + " GROUP BY TUMBLE(t, INTERVAL '10' SECOND)");

        TypeInformation<Tuple3<Timestamp,Timestamp,Integer>> tpinf = new TypeHint<Tuple3<Timestamp,Timestamp,Integer>>(){}.getTypeInfo();
        tEnv.toAppendStream(result, tpinf).print();

        env.execute();
    }


}
```

sql逻辑，每十秒钟聚合
执行结果：

```
(2019-11-01 06:53:00.0,2019-11-01 06:53:10.0,603)
(2019-11-01 06:53:20.0,2019-11-01 06:53:30.0,208)
(2019-11-01 06:53:10.0,2019-11-01 06:53:20.0,204)

```

#### 滑动窗口(HOP)

> 滑动窗口（HOP），也被称作Sliding Window。不同于滚动窗口，滑动窗口的窗口可以重叠。

滑动窗口有两个参数：slide和size。slide为每次滑动的步长，size为窗口的大小。

- slide < size，则窗口会重叠，每个元素会被分配到多个窗口。
- slide = size，则等同于滚动窗口（TUMBLE）。
- slide > size，则为跳跃窗口，窗口之间不重叠且有间隙。

通常，大部分元素符合多个窗口情景，窗口是重叠的。因此，滑动窗口在计算移动平均数（moving averages）时很实用。例如，计算过去5分钟数据的平均值，每10秒钟更新一次，可以设置slide为10秒，size为5分钟。下图为您展示间隔为30秒，窗口大小为1分钟的滑动窗口
![12.png](..%2F..%2Fstatic%2Fimg%2F12.png)

使用滑动窗口标识函数选出窗口的起始时间或者结束时间，窗口的时间属性用于下级Window的聚合。

| 窗口标识函数                                                 | 返回类型                  | 描述                                                         |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------ |
| `HOP_START（<time-attr>, <slide-interval>, <size-interval>）` | TIMESTAMP                 | 返回窗口的起始时间（包含边界）。例如`[00:10, 00:15)` 窗口，返回`00:10` 。 |
| `HOP_END（<time-attr>, <slide-interval>, <size-interval>）`  | TIMESTAMP                 | 返回窗口的结束时间（包含边界）。例如`[00:00, 00:15)` 窗口，返回`00:15`。 |
| `HOP_ROWTIME（<time-attr>, <slide-interval>, <size-interval>）` | TIMESTAMP（rowtime-attr） | 返回窗口的结束时间（不包含边界）。例如`[00:00, 00:15)` 窗口，返回`00:14:59.999`。返回值是一个rowtime attribute，即可以基于该字段做时间类型的操作，只能用在基于event time的window上。 |
| `HOP_PROCTIME（<time-attr>, <slide-interval>, <size-interval>）` | TIMESTAMP（rowtime-attr） | 返回窗口的结束时间（不包含边界）。例如`[00:00, 00:15)` 窗口，返回`00:14:59.999` 。返回值是一个proctime attribute |

滑动窗口实例：
java代码同上，sql语句改为：

```sql
SELECT HOP_START(t, INTERVAL '5' SECOND, INTERVAL '10' SECOND) AS window_start," +
                "HOP_END(t, INTERVAL '5' SECOND, INTERVAL '10' SECOND) AS window_end, SUM(v) FROM "
                + logT + " GROUP BY HOP(t, INTERVAL '5' SECOND, INTERVAL '10' SECOND)
```

每间隔5秒统计10秒内的数据
sql结果如下：

```
(2019-11-01 06:53:15.0,2019-11-01 06:53:25.0,208)
(2019-11-01 06:53:10.0,2019-11-01 06:53:20.0,204)
(2019-11-01 06:53:05.0,2019-11-01 06:53:15.0,507)
(2019-11-01 06:53:20.0,2019-11-01 06:53:30.0,208)
(2019-11-01 06:53:00.0,2019-11-01 06:53:10.0,603)
(2019-11-01 06:52:55.0,2019-11-01 06:53:05.0,300)
```

#### 会话窗口

> 会话窗口（SESSION）通过Session活动来对元素进行分组。会话窗口与滚动窗口和滑动窗口相比，没有窗口重叠，没有固定窗口大小。相反，当它在一个固定的时间周期内不再收到元素，即会话断开时，这个窗口就会关闭。
>
> 注意:
>
> 1. 会话窗口函数目前不支持批模式。
> 2. 会话窗口函数目前不支持 [性能调优](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/tuning/) 中的任何优化。
> 3. 会话窗口 Join 、会话窗口 Top-N 、会话窗口聚合功能目前理论可用，但仍处于实验阶段。遇到问题可以在 [JIRA](https://issues.apache.org/jira/browse/FLINK) 中报告。

会话窗口通过一个间隔时间（Gap）来配置，这个间隔定义了非活跃周期的长度。例如，一个表示鼠标点击活动的数据流可能具有长时间的空闲时间，并在两段空闲之间散布着高浓度的点击。 如果数据在指定的间隔（Gap）之后到达，则会开始一个新的窗口。

会话窗口示例如下图。每个Key由于不同的数据分布，形成了不同的Window。
![WX20240322-150100.png](..%2F..%2Fstatic%2Fimg%2FWX20240322-150100.png)

使用标识函数选出窗口的起始时间或者结束时间，窗口的时间属性用于下级Window的聚合。

| 窗口标识函数                                      | 返回类型                  | 描述                                                         |
| ------------------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| `SESSION_START（<time-attr>, <gap-interval>）`    | Timestamp                 | 返回窗口的起始时间（包含边界）。如`[00:10, 00:15)` 的窗口，返回 `00:10` ，即为此会话窗口内第一条记录的时间。 |
| `SESSION_END（<time-attr>, <gap-interval>）`      | Timestamp                 | 返回窗口的结束时间（包含边界）。如`[00:00, 00:15)` 的窗口，返回 `00:15`，即为此会话窗口内最后一条记录的时间+`<gap-interval>`。 |
| `SESSION_ROWTIME（<time-attr>, <gap-interval>）`  | Timestamp（rowtime-attr） | 返回窗口的结束时间（不包含边界）。如 `[00:00, 00:15)` 的窗口，返回`00:14:59.999` 。返回值是一个rowtime attribute，也就是可以基于该字段进行时间类型的操作。该参数只能用于基于event time的window 。 |
| `SESSION_PROCTIME（<time-attr>, <gap-interval>）` | Timestamp（rowtime-attr） | 返回窗口的结束时间（不包含边界）。如 `[00:00, 00:15)` 的窗口，返回 `00:14:59.999` 。返回值是一个 proctime attribute，也就是可以基于该字段进行时间类型的操作。该参数只能用于基于processing time的window 。 |

会话窗口实例：
java代码同上
sql语句如下：
每隔5秒聚合

```n1ql
"SELECT SESSION_START(t, INTERVAL '5' SECOND) AS window_start," +
                "SESSION_END(t, INTERVAL '5' SECOND) AS window_end, SUM(v) FROM "
                + logT + " GROUP BY SESSION(t, INTERVAL '5' SECOND)"
```

sql结果：

```
(2019-11-01 06:53:21.0,2019-11-01 06:53:26.0,208)
(2019-11-01 06:53:00.0,2019-11-01 06:53:05.0,300)
(2019-11-01 06:53:09.0,2019-11-01 06:53:17.0,507)
```

#### 累积窗口

累积窗口在某些场景中非常有用，比如说提前触发的滚动窗口。例如：每日仪表盘从 00:00 开始每分钟绘制累积 UV，10:00 时 UV 就是从 00:00 到 10:00 的UV 总数。累积窗口可以简单且有效地实现它。

`CUMULATE` 函数指定元素到多个窗口，从初始的窗口开始，直到达到最大的窗口大小的窗口，所有的窗口都包含其区间内的元素，另外，窗口的开始时间是固定的。 你可以将 `CUMULATE` 函数视为首先应用具有最大窗口大小的 `TUMBLE` 窗口，然后将每个滚动窗口拆分为具有相同窗口开始但窗口结束步长不同的几个窗口。 所以累积窗口会产生重叠并且没有固定大小。

例如：1小时步长，24小时大小的累计窗口，每天可以获得如下这些窗口：`[00:00, 01:00)`，`[00:00, 02:00)`，`[00:00, 03:00)`， …， `[00:00, 24:00)`

https://nightlies.apache.org/flink/flink-docs-master/fig/cumulating-windows.png

`CUMULATE`　函数通过时间属性字段为每一行数据分配了一个窗口。 在流计算模式，这个时间属性字段必须被指定为 [事件或处理时间属性](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/dev/table/concepts/time_attributes/)。 在批计算模式，这个窗口表函数的时间属性字段必须是 `TIMESTAMP` 或 `TIMESTAMP_LTZ` 的类型。 `CUMULATE` 的返回值包括原始表的所有列和附加的三个用于指定窗口的列，分别是：“window_start”，“window_end”，“window_time”。函数运行后，原有的时间属性 “timecol” 将转换为一个常规的 timestamp 列。

`CUMULATE` 有四个必填参数和一个可选参数：

```sql
CUMULATE(TABLE data, DESCRIPTOR(timecol), step, size)
```

- `data`：拥有时间属性列的表。
- `timecol`：列描述符，决定数据的哪个时间属性列应该映射到窗口。
- `step`：指定连续的累积窗口之间增加的窗口大小。
- `size`：指定累积窗口的最大宽度的窗口时间。`size`必须是`step`的整数倍。
- `offset`：窗口的偏移量 [非必填]。

下面是 `Bid` 表的调用示例：

```sql
> SELECT * FROM TABLE(
    CUMULATE(TABLE Bid, DESCRIPTOR(bidtime), INTERVAL '2' MINUTES, INTERVAL '10' MINUTES));
-- or with the named params
-- note: the DATA param must be the first
> SELECT * FROM TABLE(
    CUMULATE(
      DATA => TABLE Bid,
      TIMECOL => DESCRIPTOR(bidtime),
      STEP => INTERVAL '2' MINUTES,
      SIZE => INTERVAL '10' MINUTES));
+------------------+-------+------+------------------+------------------+-------------------------+
|          bidtime | price | item |     window_start |       window_end |            window_time  |
+------------------+-------+------+------------------+------------------+-------------------------+
| 2020-04-15 08:05 |  4.00 | C    | 2020-04-15 08:00 | 2020-04-15 08:06 | 2020-04-15 08:05:59.999 |
| 2020-04-15 08:05 |  4.00 | C    | 2020-04-15 08:00 | 2020-04-15 08:08 | 2020-04-15 08:07:59.999 |
| 2020-04-15 08:05 |  4.00 | C    | 2020-04-15 08:00 | 2020-04-15 08:10 | 2020-04-15 08:09:59.999 |
| 2020-04-15 08:07 |  2.00 | A    | 2020-04-15 08:00 | 2020-04-15 08:08 | 2020-04-15 08:07:59.999 |
| 2020-04-15 08:07 |  2.00 | A    | 2020-04-15 08:00 | 2020-04-15 08:10 | 2020-04-15 08:09:59.999 |
| 2020-04-15 08:09 |  5.00 | D    | 2020-04-15 08:00 | 2020-04-15 08:10 | 2020-04-15 08:09:59.999 |
| 2020-04-15 08:11 |  3.00 | B    | 2020-04-15 08:10 | 2020-04-15 08:12 | 2020-04-15 08:11:59.999 |
| 2020-04-15 08:11 |  3.00 | B    | 2020-04-15 08:10 | 2020-04-15 08:14 | 2020-04-15 08:13:59.999 |
| 2020-04-15 08:11 |  3.00 | B    | 2020-04-15 08:10 | 2020-04-15 08:16 | 2020-04-15 08:15:59.999 |
| 2020-04-15 08:11 |  3.00 | B    | 2020-04-15 08:10 | 2020-04-15 08:18 | 2020-04-15 08:17:59.999 |
| 2020-04-15 08:11 |  3.00 | B    | 2020-04-15 08:10 | 2020-04-15 08:20 | 2020-04-15 08:19:59.999 |
| 2020-04-15 08:13 |  1.00 | E    | 2020-04-15 08:10 | 2020-04-15 08:14 | 2020-04-15 08:13:59.999 |
| 2020-04-15 08:13 |  1.00 | E    | 2020-04-15 08:10 | 2020-04-15 08:16 | 2020-04-15 08:15:59.999 |
| 2020-04-15 08:13 |  1.00 | E    | 2020-04-15 08:10 | 2020-04-15 08:18 | 2020-04-15 08:17:59.999 |
| 2020-04-15 08:13 |  1.00 | E    | 2020-04-15 08:10 | 2020-04-15 08:20 | 2020-04-15 08:19:59.999 |
| 2020-04-15 08:17 |  6.00 | F    | 2020-04-15 08:10 | 2020-04-15 08:18 | 2020-04-15 08:17:59.999 |
| 2020-04-15 08:17 |  6.00 | F    | 2020-04-15 08:10 | 2020-04-15 08:20 | 2020-04-15 08:19:59.999 |
+------------------+-------+------+------------------+------------------+-------------------------+

-- apply aggregation on the cumulating windowed table
> SELECT window_start, window_end, SUM(price) AS total_price
  FROM TABLE(
    CUMULATE(TABLE Bid, DESCRIPTOR(bidtime), INTERVAL '2' MINUTES, INTERVAL '10' MINUTES))
  GROUP BY window_start, window_end;
+------------------+------------------+-------------+
|     window_start |       window_end | total_price |
+------------------+------------------+-------------+
| 2020-04-15 08:00 | 2020-04-15 08:06 |        4.00 |
| 2020-04-15 08:00 | 2020-04-15 08:08 |        6.00 |
| 2020-04-15 08:00 | 2020-04-15 08:10 |       11.00 |
| 2020-04-15 08:10 | 2020-04-15 08:12 |        3.00 |
| 2020-04-15 08:10 | 2020-04-15 08:14 |        4.00 |
| 2020-04-15 08:10 | 2020-04-15 08:16 |        4.00 |
| 2020-04-15 08:10 | 2020-04-15 08:18 |       10.00 |
| 2020-04-15 08:10 | 2020-04-15 08:20 |       10.00 |
+------------------+------------------+-------------+
```
