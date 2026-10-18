# JPA mapping examples

Jakarta Persistence 3.x / Hibernate 6. Adjust imports to `javax.persistence` on Hibernate 5.

## Parent with owned children

```java
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "orders_seq")
    @SequenceGenerator(name = "orders_seq", sequenceName = "orders_seq", allocationSize = 50)
    private Long id;

    @Version
    private long version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal total;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<OrderLine> lines = new HashSet<>();

    protected Order() {}

    public void addLine(OrderLine line) { lines.add(line); line.setOrder(this); }
    public void removeLine(OrderLine line) { lines.remove(line); line.setOrder(null); }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order other)) return false;
        return id != null && id.equals(other.id);
    }
    @Override public int hashCode() { return getClass().hashCode(); }
}
```

`allocationSize` must match the sequence's `INCREMENT BY` in the migration, or ids collide or Hibernate fails validation.

## Matching Flyway migration

```sql
-- V3__create_orders.sql
create sequence orders_seq start with 1 increment by 50;

create table orders (
    id          bigint primary key,
    version     bigint not null default 0,
    status      varchar(20) not null,
    total       numeric(19, 2) not null,
    customer_id bigint not null references customers (id)
);
create index idx_orders_customer_id on orders (customer_id);
```

## Spring Data: entity graph and projection

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    @EntityGraph(attributePaths = {"customer", "lines"})
    Optional<Order> findWithLinesById(Long id);

    @Query("select new com.acme.orders.OrderRow(o.id, c.name, o.total) " +
           "from Order o join o.customer c where o.status = :status")
    Page<OrderRow> findRows(@Param("status") OrderStatus status, Pageable pageable);
}
```

## Paging a collection fetch without in-memory paging

```java
List<Long> ids = em.createQuery(
        "select o.id from Order o where o.status = :status order by o.id", Long.class)
    .setParameter("status", status)
    .setFirstResult(page * size)
    .setMaxResults(size)
    .getResultList();

List<Order> orders = em.createQuery(
        "select distinct o from Order o join fetch o.lines where o.id in :ids order by o.id", Order.class)
    .setParameter("ids", ids)
    .getResultList();
```

## Kotlin notes

- Apply the `kotlin("plugin.jpa")` (no-arg) and `kotlin("plugin.allopen")` plugins, with `allOpen { annotation("jakarta.persistence.Entity") }` so lazy proxies work.
- Use a regular `class` with `var` properties, not a `data class`.
- Collections: `val lines: MutableSet<OrderLine> = mutableSetOf()`.
