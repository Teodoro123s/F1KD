import React, { useMemo, useState } from 'react';
import { BatchesIcon, BuildingIcon, GroupsIcon, PlusIcon, SearchIcon } from '../Community/CommunityIcons';

const initialProducts = [
  { id: 1, name: 'Iron + Folic Acid', type: 'Vitamin', provider: 'Municipal Health Office', stock: 120, status: 'Active' },
  { id: 2, name: 'Maternal Multivitamins', type: 'Supplement', provider: 'PhilHealth Wellness Partner', stock: 64, status: 'Active' },
  { id: 3, name: 'Infant Nutrition Powder', type: 'Third-party product', provider: 'Healthy Start Foundation', stock: 32, status: 'Low stock' },
];

const emptyProduct = { name: '', type: 'Supplement', provider: '', stock: 0, status: 'Active' };

export default function ProgramPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState(initialProducts);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyProduct);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => `${product.name} ${product.type} ${product.provider} ${product.status}`.toLowerCase().includes(term));
  }, [products, query]);

  const saveProduct = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.provider.trim()) return;
    setProducts((current) => [...current, { ...form, id: Date.now(), name: form.name.trim(), provider: form.provider.trim(), stock: Number(form.stock) || 0 }]);
    setForm(emptyProduct);
    setShowModal(false);
  };

  return (
    <div className="community-page program-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>Program</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb-current">Program</span>
          </nav>
        </div>
        <button className="btn-create-action" type="button" onClick={() => setShowModal(true)}>
          <PlusIcon />
          <span>Add Product</span>
        </button>
      </header>

      <section className="tabs-row program-tabs-row">
        <div className="tabs-list" role="tablist" aria-label="Program sections">
          <button type="button" role="tab" aria-selected={activeTab === 'products'} className={`tab-btn${activeTab === 'products' ? ' active' : ''}`} onClick={() => setActiveTab('products')}>
            <BuildingIcon /><span>Products</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'supplements'} className={`tab-btn${activeTab === 'supplements' ? ' active' : ''}`} onClick={() => setActiveTab('supplements')}>
            <GroupsIcon /><span>Supplements</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'distribution'} className={`tab-btn${activeTab === 'distribution' ? ' active' : ''}`} onClick={() => setActiveTab('distribution')}>
            <BatchesIcon /><span>Distribution</span>
          </button>
        </div>
        <div className="search-container program-search">
          <div className="search-field-container">
            <SearchIcon />
            <input id="program-search" name="programSearch" type="text" className="search-input-field" placeholder="Search products or providers..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search program products" />
          </div>
        </div>
      </section>

      <section className="program-intro">
        <div><span className="program-kicker">Program support</span><h2>{activeTab === 'distribution' ? 'Distribution records' : activeTab === 'supplements' ? 'Supplements and vitamins' : 'Program products'}</h2><p>Track supplements, vitamins, and products provided by program partners.</p></div>
        <div className="program-summary"><span>{filteredProducts.length}</span><small>{activeTab === 'distribution' ? 'items to distribute' : 'registered products'}</small></div>
      </section>

      <section className="table-card program-table-card">
        <div className="table-overflow">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Type</th><th>Provider</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredProducts.length ? filteredProducts.map((product) => (
                <tr key={product.id}><td><strong>{product.name}</strong><span className="program-table-meta">Program item #{product.id}</span></td><td>{product.type}</td><td>{product.provider}</td><td>{product.stock} pcs</td><td><span className={`program-status ${product.status === 'Low stock' ? 'low' : 'active'}`}>{product.status}</span></td><td><button type="button" className="btn-secondary program-action-button" onClick={() => setForm(product)}>View details</button></td></tr>
              )) : <tr><td colSpan="6" className="no-data">No program products match your search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowModal(false)}><form className="modal program-product-modal" onSubmit={saveProduct} onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><h2>Add program product</h2><button type="button" className="modal-close" onClick={() => setShowModal(false)} aria-label="Close">×</button></div><div className="modal-body"><label className="form-label" htmlFor="program-product-name">Product name<input id="program-product-name" className="form-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="form-label" htmlFor="program-product-type">Product type<select id="program-product-type" className="form-select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Supplement</option><option>Vitamin</option><option>Third-party product</option></select></label><label className="form-label" htmlFor="program-product-provider">Provider<input id="program-product-provider" className="form-input" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} required /></label><label className="form-label" htmlFor="program-product-stock">Available stock<input id="program-product-stock" type="number" min="0" className="form-input" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save product</button></div></form></div>}
    </div>
  );
}
