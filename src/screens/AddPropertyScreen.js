import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  FlatList,
  Modal,
  ActivityIndicator
} from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { PROPERTY_TYPES, CURRENCY_SYMBOL } from '../utils/constants';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

const AddPropertyScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    description: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    size: '',
    type: 'House',
    available: true,
    imageUrls: [''],
    latitude: '',
    longitude: '',
  });
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [addressChanged, setAddressChanged] = useState(false);

  useEffect(() => {
    // When address changes, set the flag to indicate geocoding is needed
    if (formData.address && formData.address.trim() !== '') {
      setAddressChanged(true);
    }
  }, [formData.address]);

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleImageUrlChange = (text, index) => {
    const updatedUrls = [...formData.imageUrls];
    updatedUrls[index] = text;
    setFormData({
      ...formData,
      imageUrls: updatedUrls,
    });
  };

  const addImageUrl = () => {
    setFormData({
      ...formData,
      imageUrls: [...formData.imageUrls, ''],
    });
  };

  const removeImageUrl = (index) => {
    if (formData.imageUrls.length <= 1) {
      return;
    }
    const updatedUrls = formData.imageUrls.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      imageUrls: updatedUrls,
    });
  };

  const geocodeAddress = async () => {
    if (!formData.address || formData.address.trim() === '') {
      return;
    }

    try {
      setGeocoding(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for geocoding.');
        setGeocoding(false);
        return;
      }

      // Use Expo's geocoding API
      const results = await Location.geocodeAsync(formData.address);
      
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        
        setFormData(prevData => ({
          ...prevData,
          latitude: latitude.toString(),
          longitude: longitude.toString()
        }));
        
        console.log(`Geocoded ${formData.address} to: ${latitude}, ${longitude}`);
      } else {
        // Use North Pole coordinates if geocoding fails (90.0000, 135.0000)
        setFormData(prevData => ({
          ...prevData,
          latitude: '90.0000',
          longitude: '135.0000'
        }));
        
        console.log(`Geocoding failed for ${formData.address}, using North Pole coordinates`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      // Use North Pole coordinates if geocoding fails
      setFormData(prevData => ({
        ...prevData,
        latitude: '90.0000',
        longitude: '135.0000'
      }));
    } finally {
      setGeocoding(false);
      setAddressChanged(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.address) {
      Alert.alert('Error', 'Address is required');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Filter out empty image URLs
      const filteredImageUrls = formData.imageUrls.filter(url => url.trim() !== '');

      // Create new property document
      const propertyData = {
        address: formData.address,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        area: formData.size ? parseFloat(formData.size) : null,
        type: formData.type || 'House',
        available: formData.available,
        imageUrl: filteredImageUrls.length > 0 ? filteredImageUrls : [],
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        createTime: "Just now",
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'houses'), propertyData);
      
      Alert.alert(
        'Success',
        'Property added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding property:', error);
      Alert.alert('Error', error.message || 'Failed to add property');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSelector = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={typeModalVisible}
      onRequestClose={() => setTypeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Property Type</Text>
          <ScrollView style={styles.typeList}>
            {PROPERTY_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeOption,
                  formData.type === type && styles.selectedTypeOption
                ]}
                onPress={() => {
                  handleInputChange('type', type);
                  setTypeModalVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.typeOptionText,
                    formData.type === type && styles.selectedTypeOptionText
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setTypeModalVisible(false)}
          >
            <Text style={styles.closeModalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Property</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Address *</Text>
            <View style={styles.addressContainer}>
              <TextInput
                style={styles.addressInput}
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                placeholder="Property Address"
              />
              {addressChanged && (
                <TouchableOpacity
                  style={styles.geocodeButton}
                  onPress={geocodeAddress}
                  disabled={geocoding}
                >
                  {geocoding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.geocodeButtonText}>📍</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Property Description"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Property Type</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setTypeModalVisible(true)}
            >
              <Text style={styles.selectorButtonText}>{formData.type}</Text>
              <Text style={styles.selectorIcon}>▼</Text>
            </TouchableOpacity>
            
            <Text style={styles.inputLabel}>Price ({CURRENCY_SYMBOL})</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(text) => handleInputChange('price', text)}
              placeholder="Price"
              keyboardType="numeric"
            />
            
            <View style={styles.rowContainer}>
              <View style={styles.halfColumn}>
                <Text style={styles.inputLabel}>Bedrooms</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bedrooms}
                  onChangeText={(text) => handleInputChange('bedrooms', text)}
                  placeholder="Number of Bedrooms"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.halfColumn}>
                <Text style={styles.inputLabel}>Bathrooms</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bathrooms}
                  onChangeText={(text) => handleInputChange('bathrooms', text)}
                  placeholder="Number of Bathrooms"
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <Text style={styles.inputLabel}>Size (sq ft)</Text>
            <TextInput
              style={styles.input}
              value={formData.size}
              onChangeText={(text) => handleInputChange('size', text)}
              placeholder="Property Size"
              keyboardType="numeric"
            />

            <View style={styles.availabilityContainer}>
              <Text style={styles.inputLabel}>Availability</Text>
              <View style={styles.radioContainer}>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    formData.available && styles.radioButtonSelected
                  ]}
                  onPress={() => handleInputChange('available', true)}
                >
                  <Text style={formData.available ? styles.radioTextSelected : styles.radioText}>
                    Available
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    !formData.available && styles.radioButtonSelected
                  ]}
                  onPress={() => handleInputChange('available', false)}
                >
                  <Text style={!formData.available ? styles.radioTextSelected : styles.radioText}>
                    Not Available
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.imagesSection}>
              <Text style={styles.inputLabel}>Property Images</Text>
              <Text style={styles.inputHelper}>
                Add URLs for property images (at least one recommended)
              </Text>

              {formData.imageUrls.map((url, index) => (
                <View key={`image-${index}`} style={styles.imageUrlContainer}>
                  <TextInput
                    style={styles.imageUrlInput}
                    value={url}
                    onChangeText={(text) => handleImageUrlChange(text, index)}
                    placeholder="Enter image URL"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImageUrl(index)}
                    disabled={formData.imageUrls.length <= 1}
                  >
                    <Text style={[
                      styles.removeImageButtonText,
                      formData.imageUrls.length <= 1 && styles.disabledButtonText
                    ]}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity 
                style={styles.addImageButton}
                onPress={addImageUrl}
              >
                <Text style={styles.addImageButtonText}>+ Add Another Image</Text>
              </TouchableOpacity>

              {formData.imageUrls[0].trim() !== '' && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Preview:</Text>
                  <FlatList
                    data={formData.imageUrls.filter(url => url.trim() !== '')}
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    keyExtractor={(_, index) => `preview-${index}`}
                    renderItem={({ item }) => (
                      <View style={styles.imagePreview}>
                        <Image 
                          source={{ uri: item }} 
                          style={styles.previewImage}
                          resizeMode="cover"
                          onError={() => console.log('Image preview loading failed')}
                        />
                      </View>
                    )}
                  />
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Adding Property...' : 'Add Property'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        {renderTypeSelector()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#3498db',
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  inputHelper: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  selectorButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  selectorIcon: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfColumn: {
    width: '48%',
  },
  availabilityContainer: {
    marginBottom: 15,
  },
  radioContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  radioButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    borderRadius: 8,
  },
  radioButtonSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  radioText: {
    color: '#7f8c8d',
  },
  radioTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  imagesSection: {
    marginBottom: 15,
  },
  imageUrlContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  imageUrlInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeImageButton: {
    backgroundColor: '#e74c3c',
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 10,
  },
  removeImageButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  addImageButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  addImageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  previewContainer: {
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  imagePreview: {
    width: 150,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#9b59b6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  typeList: {
    maxHeight: 300,
  },
  typeOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  selectedTypeOption: {
    backgroundColor: '#ecf0f1',
  },
  typeOptionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  selectedTypeOptionText: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  closeModalButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sectionDivider: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    marginTop: 10,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  addressInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  geocodeButton: {
    backgroundColor: '#3498db',
    padding: 15,
    marginLeft: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    width: 52,
  },
  geocodeButtonText: {
    color: 'white',
    fontSize: 18,
  },
});

export default AddPropertyScreen; 