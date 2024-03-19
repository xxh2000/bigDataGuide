import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Hadoop',
    Svg: require('@site/static/img/hadoop.svg').default,
    description: (
      <>
          Hadoop是一个开源的分布式存储和计算框架，旨在处理大规模数据集。它最初由Apache软件基金会开发，是目前用于大数据处理的主流工具之一
      </>
    ),
  },
  {
    title: 'Hive',
    Svg: require('@site/static/img/Apache_Hive_logo.svg').default,
    description: (
      <>
          Apache Hive是建立在Hadoop之上的数据仓库工具，它提供了一种类似于SQL的查询语言,用于对存储在Hadoop集群中的数据进行查询和分析。
      </>
    ),
  },
  {
    title: 'Spark',
    Svg: require('@site/static/img/apache_spark-ar21.svg').default,
    description: (
      <>
          Apache Spark是一个快速、通用的集群计算系统，最初是为大规模数据处理而设计的。使用户能够轻松地编写并行处理应用程序。

      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
