import { useEffect, useState } from "react";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/router";
import { useServices } from "../../context/ServicesContext";

export default function AdminServicesPage() {
  const { services, addService, updateService, deleteService, addVariation, updateVariation, deleteVariation } = useServices();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  
  const [editingService, setEditingService] = useState(null);
  const [editingVariation, setEditingVariation] = useState(null);
  const [activeTab, setActiveTab] = useState('add');
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Head Spa Treatments',
    description: '',
    duration: '',
    price: '',
    image: '',
    variations: []
  });
  
  const [variationForm, setVariationForm] = useState({
    name: 'Standard',
    price: '',
    duration: '',
    currency: 'USD'
  });
  
  const categories = [
    'Head Spa Treatments',
    'Body Massage Treatments', 
    'Foot Care',
    'Manicure Services',
    'Cupping Therapy'
  ];

  // Protect the page with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoadingAuth(false);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (editingService) {
      setFormData({
        name: editingService.name,
        category: editingService.category,
        description: editingService.description,
        duration: editingService.duration,
        price: editingService.price,
        image: editingService.image,
        variations: editingService.variations || []
      });
    }
  }, [editingService]);

  const handleServiceSubmit = (e) => {
    e.preventDefault();
    
    const displayPrice = formData.price.includes('$') 
      ? formData.price 
      : `$${parseFloat(formData.price).toFixed(2)}`;
    
    const serviceData = {
      id: editingService ? editingService.id : formData.name.toLowerCase().replace(/\s+/g, '-'),
      name: formData.name,
      category: formData.category,
      description: formData.description,
      duration: parseInt(formData.duration),
      price: displayPrice,
      image: formData.image,
      variations: formData.variations.map(variation => ({
        id: variation.id || `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${variation.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: variation.name,
        price: parseInt(variation.price) * 100,
        currency: variation.currency || 'USD',
        duration: parseInt(variation.duration) * 60000,
        version: 1
      }))
    };
    
    if (editingService) {
      updateService(editingService.id, serviceData);
    } else {
      addService(serviceData);
    }
    
    resetForm();
  };

  const handleVariationSubmit = (e) => {
    e.preventDefault();
    
    if (!editingService) {
      alert('Please select a service first');
      return;
    }
    
    const variationData = {
      id: `${editingService.id}-${variationForm.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: variationForm.name,
      price: parseInt(variationForm.price) * 100,
      currency: variationForm.currency,
      duration: parseInt(variationForm.duration) * 60000,
      version: 1
    };
    
    if (editingVariation) {
      updateVariation(editingService.id, editingVariation.id, variationData);
    } else {
      addVariation(editingService.id, variationData);
    }
    
    resetVariationForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Head Spa Treatments',
      description: '',
      duration: '',
      price: '',
      image: '',
      variations: []
    });
    setEditingService(null);
    setEditingVariation(null);
    setActiveTab('add');
  };

  const resetVariationForm = () => {
    setVariationForm({
      name: 'Standard',
      price: '',
      duration: '',
      currency: 'USD'
    });
    setEditingVariation(null);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setActiveTab('edit');
  };

  const handleEditVariation = (service, variation) => {
    setEditingService(service);
    setEditingVariation(variation);
    setVariationForm({
      name: variation.name,
      price: (variation.price / 100).toString(),
      duration: (variation.duration / 60000).toString(),
      currency: variation.currency
    });
    setActiveTab('variations');
  };

  const handleDeleteVariation = (serviceId, variationId) => {
    if (confirm('Are you sure you want to delete this variation?')) {
      deleteVariation(serviceId, variationId);
    }
  };

  const handleDeleteService = (id) => {
    if (confirm('Are you sure you want to delete this service? This will also delete all variations.')) {
      deleteService(id);
    }
  };

  if (loadingAuth) return <p className="text-center mt-10">Checking authentication...</p>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🛠️ Service Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-200 px-3 py-1 rounded text-sm"
          >
            ← Back to Admin
          </button>
          <button
            onClick={() => auth.signOut().then(() => router.push("/login"))}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="border-b">
            <nav className="flex space-x-4">
              <button
                onClick={() => { setActiveTab('add'); resetForm(); }}
                className={`py-2 px-4 ${activeTab === 'add' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              >
                {editingService ? 'Edit Service' : 'Add New Service'}
              </button>
              {editingService && (
                <>
                  <button
                    onClick={() => setActiveTab('variations')}
                    className={`py-2 px-4 ${activeTab === 'variations' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                  >
                    Manage Variations
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Service Form */}
          {activeTab === 'add' || activeTab === 'edit' ? (
            <form onSubmit={handleServiceSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                    placeholder="e.g., Classic Relax 经典舒缓头疗"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full p-2 border rounded"
                    rows="3"
                    required
                    placeholder="Include both English and Chinese descriptions"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                    min="1"
                    placeholder="e.g., 60"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD) *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 rounded-l bg-gray-50">
                      $
                    </span>
                    <input
                      type="number"
                      value={formData.price.replace('$', '')}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full p-2 border rounded-r"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g., 99.00"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    className="w-full p-2 border rounded"
                    placeholder="/images/service-name.jpg"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {editingService ? 'Update Service' : 'Add Service'}
                </button>
                {editingService && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : null}

          {/* Variation Form */}
          {activeTab === 'variations' && editingService && (
            <form onSubmit={handleVariationSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
              <h3 className="text-lg font-semibold">
                {editingVariation ? 'Edit Variation' : 'Add New Variation'} for {editingService.name}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variation Name *
                  </label>
                  <input
                    type="text"
                    value={variationForm.name}
                    onChange={(e) => setVariationForm({...variationForm, name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                    placeholder="e.g., Standard, 90 Minutes, Deluxe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={variationForm.duration}
                    onChange={(e) => setVariationForm({...variationForm, duration: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                    min="1"
                    placeholder="e.g., 90"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD) *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 rounded-l bg-gray-50">
                      $
                    </span>
                    <input
                      type="number"
                      value={variationForm.price}
                      onChange={(e) => setVariationForm({...variationForm, price: e.target.value})}
                      className="w-full p-2 border rounded-r"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g., 149.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={variationForm.currency}
                    onChange={(e) => setVariationForm({...variationForm, currency: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CAD">CAD (C$)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  {editingVariation ? 'Update Variation' : 'Add Variation'}
                </button>
                <button
                  type="button"
                  onClick={resetVariationForm}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  {editingVariation ? 'Cancel' : 'Clear'}
                </button>
              </div>
            </form>
          )}

          {/* Current Variations List */}
          {activeTab === 'variations' && editingService && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Current Variations</h3>
              {editingService.variations && editingService.variations.length > 0 ? (
                <div className="space-y-3">
                  {editingService.variations.map((variation) => (
                    <div key={variation.id} className="border p-3 rounded flex justify-between items-center">
                      <div>
                        <span className="font-medium">{variation.name}</span>
                        <div className="text-sm text-gray-600">
                          ${(variation.price / 100).toFixed(2)} • {variation.duration / 60000} min
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditVariation(editingService, variation)}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVariation(editingService.id, variation.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No variations yet. Add your first variation above.</p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Services List */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">All Services ({services.length})</h2>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search services..."
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {services.length === 0 ? (
                <p className="text-gray-500">No services yet.</p>
              ) : (
                services.map(service => (
                  <div key={service.id} className="border p-3 rounded hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-600">{service.category}</div>
                        <div className="text-sm">
                          <span className="text-green-600">{service.price}</span>
                          <span className="text-gray-500 ml-2">• {service.duration} min</span>
                        </div>
                        {service.variations && service.variations.length > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            {service.variations.length} variation{service.variations.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEditService(service)}
                          className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1"
                          title="Edit service"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                          title="Delete service"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="bg-white p-6 rounded-lg shadow-md mt-4">
            <h3 className="text-lg font-semibold mb-3">Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-2xl font-bold text-blue-600">{services.length}</div>
                <div className="text-sm text-gray-600">Total Services</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {services.reduce((sum, service) => sum + (service.variations?.length || 1), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Options</div>
              </div>
              {categories.map(cat => {
                const count = services.filter(s => s.category === cat).length;
                if (count > 0) {
                  return (
                    <div key={cat} className="bg-gray-50 p-2 rounded col-span-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{cat}</span>
                        <span className="text-sm text-gray-600">{count} services</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}