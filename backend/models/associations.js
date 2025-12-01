const Order = require('./Order');
const Supplier = require('./Supplier');
const Material = require('./Material');
const Product = require('./Product');
const FreightHandler = require('./FreightHandler');

// Define associations/relationships

// Material belongs to Supplier
Material.belongsTo(Supplier, {
  foreignKey: 'supplierId',
  as: 'supplier',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Supplier has many Materials
Supplier.hasMany(Material, {
  foreignKey: 'supplierId',
  as: 'materials',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Note: Order-Supplier relationship is currently stored as JSONB
// If you want to add a foreign key relationship, you would do:
// Order.belongsTo(Supplier, {
//   foreignKey: 'supplierId',
//   as: 'supplier',
//   onDelete: 'SET NULL',
//   onUpdate: 'CASCADE'
// });
// Supplier.hasMany(Order, {
//   foreignKey: 'supplierId',
//   as: 'orders',
//   onDelete: 'SET NULL',
//   onUpdate: 'CASCADE'
// });

// Note: Order-Material relationship is currently stored as JSONB in materials field
// For a proper many-to-many relationship, you would need a junction table:
// const OrderMaterial = sequelize.define('OrderMaterial', {
//   orderId: { type: DataTypes.INTEGER, references: { model: Order, key: 'id' } },
//   materialId: { type: DataTypes.INTEGER, references: { model: Material, key: 'id' } },
//   quantity: DataTypes.DECIMAL(10, 2),
//   unitPrice: DataTypes.DECIMAL(10, 2)
// });
// Order.belongsToMany(Material, { through: OrderMaterial, as: 'materials' });
// Material.belongsToMany(Order, { through: OrderMaterial, as: 'orders' });

module.exports = {
  Order,
  Supplier,
  Material,
  Product,
  FreightHandler
};

