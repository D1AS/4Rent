import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList,
  Modal
} from 'react-native';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { PROPERTY_TYPES, CURRENCY_SYMBOL } from '../utils/constants';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PropertyScreen = ({ route, navigation }) => {
  const { propertyId } = route.params;
  const [property, setProperty] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [geocoding, setGeocoding] = useState(false);
  const [addressChanged, setAddressChanged] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    description: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    size: '',
    type: '',
    available: true,
    imageUrl: [],
    latitude: '',
    longitude: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Check if current user is the owner
  const isOwner = property?.ownerId === auth.currentUser?.uid;

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPropertyDetails();
    }, [propertyId])
  );

  // Keep the existing useEffect for initial loading
  useEffect(() => {
    fetchPropertyDetails();
  }, [propertyId]);

  useEffect(() => {
    // When address changes, set the flag to indicate geocoding is needed
    if (isEditing && formData.address && formData.address !== property?.address) {
      setAddressChanged(true);
    }
  }, [formData.address, property?.address, isEditing]);

  const fetchPropertyDetails = async () => {
    setLoading(true);
    try {
      const propertyRef = doc(db, 'houses', propertyId);
      const propertySnap = await getDoc(propertyRef);
      
      if (propertySnap.exists()) {
        const propertyData = {
          id: propertySnap.id,
          ...propertySnap.data()
        };
        setProperty(propertyData);
        setFormData({
          address: propertyData.address || '',
          description: propertyData.description || '',
          price: propertyData.price ? propertyData.price.toString() : '',
          bedrooms: propertyData.bedrooms ? propertyData.bedrooms.toString() : '',
          bathrooms: propertyData.bathrooms ? propertyData.bathrooms.toString() : '',
          size: propertyData.area ? propertyData.area.toString() : '',
          type: propertyData.type || 'House',
          available: propertyData.available !== undefined ? propertyData.available : true,
          imageUrl: propertyData.imageUrl || [],
          latitude: propertyData.latitude ? propertyData.latitude.toString() : '',
          longitude: propertyData.longitude ? propertyData.longitude.toString() : '',
        });
      } else {
        Alert.alert('Error', 'Property not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
      Alert.alert('Error', 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSave = async () => {
    if (!formData.address) {
      Alert.alert('Error', 'Address is required');
      return;
    }

    setSaveLoading(true);
    try {
      const propertyRef = doc(db, 'houses', propertyId);
      await updateDoc(propertyRef, {
        address: formData.address,
        description: formData.description,
        price: formData.price ? parseFloat(formData.price) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        area: formData.size ? parseFloat(formData.size) : null,
        type: formData.type,
        available: formData.available,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        updatedAt: new Date(),
      });

      Alert.alert('Success', 'Property updated successfully');
      setIsEditing(false);
      fetchPropertyDetails(); // Reload the data
    } catch (error) {
      console.error('Error updating property:', error);
      Alert.alert('Error', 'Failed to update property');
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this property? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const propertyRef = doc(db, 'houses', propertyId);
      await deleteDoc(propertyRef);
      Alert.alert('Success', 'Property deleted successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting property:', error);
      Alert.alert('Error', 'Failed to delete property');
      setDeleteLoading(false);
    }
  };

  const renderImageCarousel = () => {
    if (!property?.imageUrl || property.imageUrl.length === 0) {
      return (
        <View style={styles.imageContainer}>
          <View style={styles.defaultImageContainer}>
            <Text style={styles.defaultImageText}>No Image Available</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.carouselContainer}>
        <FlatList
          data={property.imageUrl}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `image-${index}`}
          onScroll={(event) => {
            const slideIndex = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
            if (slideIndex !== currentImageIndex) {
              setCurrentImageIndex(slideIndex);
            }
          }}
          renderItem={({ item, index }) => (
            <View style={styles.imageContainer}>
              {imageErrors[index] ? (
                <View style={styles.defaultImageContainer}>
                  <Text style={styles.defaultImageText}>Image Not Available</Text>
                </View>
              ) : (
                <Image 
                  source={{ uri: item }} 
                  style={styles.propertyImage}
                  resizeMode="cover"
                  onError={() => {
                    console.log('Image loading error for index:', index);
                    setImageErrors(prev => ({...prev, [index]: true}));
                  }}
                />
              )}
            </View>
          )}
        />
        {property.imageUrl.length > 1 && (
          <View style={styles.paginationContainer}>
            {property.imageUrl.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.paginationDot,
                  { opacity: currentImageIndex === index ? 1 : 0.5 }
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Property' : 'Property Details'}
        </Text>
        {isOwner && !isEditing && (
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        {isEditing && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => {
              setIsEditing(false);
              setFormData({
                address: property.address || '',
                description: property.description || '',
                price: property.price ? property.price.toString() : '',
                bedrooms: property.bedrooms ? property.bedrooms.toString() : '',
                bathrooms: property.bathrooms ? property.bathrooms.toString() : '',
                size: property.area ? property.area.toString() : '',
                type: property.type || 'House',
                available: property.available !== undefined ? property.available : true,
                imageUrl: property.imageUrl || [],
                latitude: property.latitude ? property.latitude.toString() : '',
                longitude: property.longitude ? property.longitude.toString() : '',
              });
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollContainer}>
        {isEditing ? (
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
            
            <Text style={styles.inputLabel}>Price ({CURRENCY_SYMBOL})</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(text) => handleInputChange('price', text)}
              placeholder="Price"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Property Type</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setTypeModalVisible(true)}
            >
              <Text style={styles.selectorButtonText}>{formData.type}</Text>
              <Text style={styles.selectorIcon}>▼</Text>
            </TouchableOpacity>
            
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
            
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              disabled={saveLoading}
            >
              <Text style={styles.saveButtonText}>
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={confirmDelete}
              disabled={deleteLoading}
            >
              <Text style={styles.deleteButtonText}>
                {deleteLoading ? 'Deleting...' : 'Delete Property'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.detailsContainer}>
            {!isOwner && (
              <View style={styles.notOwnerBadge}>
                <Text style={styles.notOwnerBadgeText}>View Only</Text>
              </View>
            )}

            {renderImageCarousel()}
            
            <View style={styles.contentContainer}>
              {property.available !== undefined && (
                <View style={[
                  styles.availabilityBadge, 
                  property.available ? styles.availableBadge : styles.notAvailableBadge
                ]}>
                  <Text style={styles.availabilityBadgeText}>
                    {property.available ? 'Available' : 'Not Available'}
                  </Text>
                </View>
              )}

              <View style={styles.titleContainer}>
                <Text style={styles.propertyTitle}>{property.address}</Text>
                {property.type && (
                  <Text style={styles.propertyTypeText}>{property.type}</Text>
                )}
              </View>
              
              {property.price && (
                <Text style={styles.propertyPrice}>
                  {CURRENCY_SYMBOL}{property.price.toLocaleString()}
                </Text>
              )}

              {property.createTime && (
                <Text style={styles.listedTime}>Listed: {property.createTime}</Text>
              )}
              
              <View style={styles.propertySpecsRow}>
                {property.bedrooms && (
                  <View style={styles.propertySpecItem}>
                    <Text style={styles.propertySpecIcon}>🛏️</Text>
                    <Text style={styles.propertySpecValue}>{property.bedrooms}</Text>
                  </View>
                )}
                
                {property.bathrooms && (
                  <View style={styles.propertySpecItem}>
                    <Text style={styles.propertySpecIcon}>🛁</Text>
                    <Text style={styles.propertySpecValue}>{property.bathrooms}</Text>
                  </View>
                )}
                
                {property.area && (
                  <View style={styles.propertySpecItem}>
                    <Text style={styles.propertySpecIcon}>📏</Text>
                    <Text style={styles.propertySpecValue}>{property.area}+ sqft</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>
                  {property.description || 'No description provided.'}
                </Text>
              </View>

              {property.latitude && property.longitude && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.mapContainer}>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: property.latitude,
                        longitude: property.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }}
                    >
                      <Marker
                        coordinate={{
                          latitude: property.latitude,
                          longitude: property.longitude
                        }}
                        title={property.address}
                      />
                    </MapView>
                  </View>
                </View>
              )}
              
              {isOwner && (
                <TouchableOpacity 
                  style={styles.editButtonLarge} 
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.editButtonLargeText}>Edit Property</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      
      {renderTypeSelector()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  editButton: {
    padding: 5,
  },
  editButtonText: {
    color: '#3498db',
    fontSize: 16,
  },
  cancelButton: {
    padding: 5,
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  detailsContainer: {
    flex: 1,
  },
  carouselContainer: {
    width: width,
    height: width * 0.75,
    position: 'relative',
  },
  imageContainer: {
    width: width,
    height: width * 0.75,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'white',
  },
  contentContainer: {
    padding: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  notOwnerBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  notOwnerBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  availabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 15,
  },
  availableBadge: {
    backgroundColor: '#2ecc71',
  },
  notAvailableBadge: {
    backgroundColor: '#e74c3c',
  },
  availabilityBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  propertyTypeText: {
    fontSize: 13,
    color: '#3498db',
    backgroundColor: '#ecf0f1',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 3,
  },
  propertyPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e67e22',
    marginBottom: 5,
  },
  listedTime: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 20,
  },
  propertySpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  propertySpecItem: {
    marginRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertySpecIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  propertySpecValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  editButtonLarge: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  editButtonLargeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
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
  textArea: {
    height: 150,
    textAlignVertical: 'top',
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
  saveButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  defaultImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultImageText: {
    color: '#7f8c8d',
    fontSize: 18,
    fontWeight: 'bold',
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

export default PropertyScreen; 