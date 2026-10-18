# Examples: MyBatis, jOOQ, Exposed

Each snippet shows one pattern from SKILL.md. Adapt names to the project; check the API against the docs for the library version in use.

## MyBatis: dynamic search with a safe sort column

```xml
<mapper namespace="com.example.order.OrderMapper">
  <resultMap id="orderWithLines" type="com.example.order.Order">
    <id property="id" column="o_id"/>
    <result property="status" column="o_status"/>
    <collection property="lines" ofType="com.example.order.OrderLine">
      <id property="id" column="l_id"/>
      <result property="sku" column="l_sku"/>
      <result property="quantity" column="l_qty"/>
    </collection>
  </resultMap>

  <select id="search" resultMap="orderWithLines">
    SELECT o.id o_id, o.status o_status, l.id l_id, l.sku l_sku, l.quantity l_qty
    FROM orders o LEFT JOIN order_lines l ON l.order_id = o.id
    <where>
      <if test="status != null">AND o.status = #{status}</if>
      <if test="customerIds != null and !customerIds.isEmpty()">
        AND o.customer_id IN
        <foreach item="cid" collection="customerIds" open="(" separator="," close=")">#{cid}</foreach>
      </if>
    </where>
    ORDER BY ${sortColumn}, o.id
  </select>
</mapper>
```

```java
// The only ${} input: chosen from a fixed map, never from the raw request.
private static final Map<String, String> SORTS = Map.of("created", "o.created_at", "total", "o.total");
String sortColumn = SORTS.getOrDefault(request.sort(), "o.created_at");
```

Joins with collections multiply rows; paginate parents first (select the page of order ids, then join lines for those ids).

## MyBatis: batch insert

```java
try (SqlSession session = sqlSessionFactory.openSession(ExecutorType.BATCH)) {
    OrderLineMapper mapper = session.getMapper(OrderLineMapper.class);
    int n = 0;
    for (OrderLine line : lines) {
        mapper.insert(line);
        if (++n % 500 == 0) session.flushStatements();
    }
    session.commit();
}
```

In Spring, define a second `SqlSessionTemplate` with `ExecutorType.BATCH` and use it inside the service's `@Transactional` method.

## jOOQ: parent with children in one query

```java
List<OrderDto> orders = dsl
    .select(
        ORDERS.ID, ORDERS.STATUS,
        multiset(
            select(ORDER_LINES.SKU, ORDER_LINES.QUANTITY)
                .from(ORDER_LINES)
                .where(ORDER_LINES.ORDER_ID.eq(ORDERS.ID))
        ).convertFrom(r -> r.map(Records.mapping(LineDto::new))))
    .from(ORDERS)
    .where(ORDERS.CUSTOMER_ID.eq(customerId))
    .orderBy(ORDERS.ID)
    .limit(50)
    .fetch(Records.mapping(OrderDto::new));
```

## jOOQ: transaction and batch

```java
dsl.transaction(cfg -> {
    DSLContext tx = DSL.using(cfg);
    tx.batchInsert(lineRecords).execute();
    tx.update(ORDERS).set(ORDERS.STATUS, "READY").where(ORDERS.ID.eq(orderId)).execute();
});
```

## Exposed: DSL query, eager DAO load, batch insert (1.x packages)

```kotlin
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.LongIdTable
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.batchInsert
import org.jetbrains.exposed.v1.jdbc.selectAll

object Orders : LongIdTable("orders") {
    val customerId = long("customer_id").index()
    val status = varchar("status", 20)
}

fun openOrders(customer: Long) = transaction {
    Orders.selectAll()
        .where { (Orders.customerId eq customer) and (Orders.status eq "OPEN") }
        .map { it[Orders.id].value to it[Orders.status] }
}

fun saveLines(lines: List<LineInput>) = transaction {
    OrderLines.batchInsert(lines) { line ->
        this[OrderLines.orderId] = line.orderId
        this[OrderLines.sku] = line.sku
    }
}
```

DAO eager loading: `Order.find { Orders.customerId eq id }.with(Order::lines)`.

Import paths above follow the Exposed 1.0 migration guide (core table types under `v1.core`, JDBC operations under `v1.jdbc`); confirm each import in the docs for the exact version, and use the 0.x `org.jetbrains.exposed.sql.*` packages if the project has not migrated.

## HikariCP (Spring Boot properties)

```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.max-lifetime=1500000
spring.datasource.hikari.keepalive-time=300000
spring.datasource.hikari.leak-detection-threshold=60000
```

`max-lifetime` here assumes an infrastructure idle cutoff above 25 minutes; set it below whatever your database or proxy enforces. Leak detection is for staging and diagnosis; it logs a stack trace for connections held longer than the threshold.
