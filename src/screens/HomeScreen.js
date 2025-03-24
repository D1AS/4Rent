import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Switch, TextInput, Image } from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, startAt, endAt } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCY_SYMBOL } from '../utils/constants';
import { useFocusEffect } from '@react-navigation/native';

const HomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [displayedProperties, setDisplayedProperties] = useState([]);
  const [user, setUser] = useState(null);
  const [showAllProperties, setShowAllProperties] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [])
  );

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    // Filter properties when showAllProperties toggle changes
    if (showAllProperties) {
      setFilteredProperties(properties);
    } else {
      // Show only user's properties
      const userProperties = properties.filter(property => property.ownerId === user?.uid);
      setFilteredProperties(userProperties);
    }
  }, [showAllProperties, properties, user]);

  useEffect(() => {
    // Apply search filter to the already filtered properties
    if (searchQuery.trim() === '') {
      setDisplayedProperties(filteredProperties);
    } else {
      const searchLower = searchQuery.trim().toLowerCase();
      const results = filteredProperties.filter(property => 
        (property.address && property.address.toLowerCase().includes(searchLower)) ||
        (property.description && property.description.toLowerCase().includes(searchLower))
      );
      setDisplayedProperties(results);
    }
  }, [filteredProperties, searchQuery]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      // Get current user
      const currentUser = auth.currentUser;
      setUser(currentUser);
      
      // Fetch all properties
      const propertiesCollection = collection(db, 'houses');
      const propertiesSnapshot = await getDocs(propertiesCollection);
      const propertiesList = propertiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProperties(propertiesList);
      
      // By default, show only user's properties
      const userProperties = propertiesList.filter(property => property.ownerId === currentUser?.uid);
      setFilteredProperties(userProperties);
      setDisplayedProperties(userProperties);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Navigation will be handled in App.js
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Property Management</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            showAllProperties ? styles.filterButtonActive : styles.filterButtonInactive
          ]}
          onPress={() => setShowAllProperties(true)}
        >
          <Text style={[
            styles.filterButtonText,
            showAllProperties ? styles.filterButtonTextActive : styles.filterButtonTextInactive
          ]}>All Properties</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            !showAllProperties ? styles.filterButtonActive : styles.filterButtonInactive
          ]}
          onPress={() => setShowAllProperties(false)}
        >
          <Text style={[
            styles.filterButtonText,
            !showAllProperties ? styles.filterButtonTextActive : styles.filterButtonTextInactive
          ]}>My Properties</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProperty')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {displayedProperties.length > 0 ? (
        <FlatList
          data={displayedProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.propertyCard,
                item.ownerId === user?.uid ? styles.userPropertyCard : null
              ]}
              onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
            >
              {item.ownerId === user?.uid && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Mine</Text>
                </View>
              )}
              
              {item.imageUrl && item.imageUrl.length > 0 ? (
                <Image 
                  source={{ uri: item.imageUrl[0] }} 
                  style={styles.propertyImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.propertyImagePlaceholder}>
                  <Text style={styles.propertyImagePlaceholderText}>No Image</Text>
                </View>
              )}
              
              <View style={styles.propertyContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.propertyPrice}>
                    {CURRENCY_SYMBOL}{item.price ? item.price.toLocaleString() : 'Price not specified'}
                  </Text>
                  {item.type && (
                    <Text style={styles.propertyTypeText}>{item.type}</Text>
                  )}
                </View>
                
                <Text style={styles.propertyAddress}>{item.address || 'No Address'}</Text>
                
                {/* Property specs row */}
                <View style={styles.propertySpecsRow}>
                  {item.bedrooms && (
                    <View style={styles.propertySpecItem}>
                      <Text style={styles.propertySpecIcon}>🛏️</Text>
                      <Text style={styles.propertySpecValue}>{item.bedrooms}</Text>
                    </View>
                  )}
                  
                  {item.bathrooms && (
                    <View style={styles.propertySpecItem}>
                      <Text style={styles.propertySpecIcon}>🛁</Text>
                      <Text style={styles.propertySpecValue}>{item.bathrooms}</Text>
                    </View>
                  )}
                  
                  {item.area && (
                    <View style={styles.propertySpecItem}>
                      <Text style={styles.propertySpecIcon}>📏</Text>
                      <Text style={styles.propertySpecValue}>{item.area}+ sqft</Text>
                    </View>
                  )}
                </View>
                
                {item.available === false && (
                  <View style={styles.notAvailableTag}>
                    <Text style={styles.notAvailableText}>Not Available</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No properties found</Text>
          <Text style={styles.emptySubText}>
            {showAllProperties 
              ? "There are no properties available at the moment." 
              : "You haven't added any properties yet."
            }
          </Text>
        </View>
      )}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#3498db',
  },
  filterButtonInactive: {
    backgroundColor: '#e0e0e0',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  filterButtonTextInactive: {
    color: '#555',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginHorizontal: 15,
    marginBottom: 15,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 20,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  propertyCard: {
    backgroundColor: 'white',
    padding: 0,
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  userPropertyCard: {
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  ownerBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#2ecc71',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 10,
  },
  ownerBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  propertyAddress: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 6,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e67e22',
    marginBottom: 3,
  },
  listContent: {
    paddingTop: 5,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  emptySubText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 10,
  },
  propertyImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 0,
  },
  propertyImagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#ecf0f1',
    marginBottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyImagePlaceholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  propertyContent: {
    padding: 10,
    paddingBottom: 8,
  },
  propertySpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#f8f9fa',
    padding: 6,
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
  secondaryInfoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 0,
  },
  propertyTypeTag: {
    backgroundColor: '#3498db',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  propertyTypeText: {
    fontSize: 13,
    color: '#3498db',
    backgroundColor: '#ecf0f1',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 3,
  },
  notAvailableTag: {
    backgroundColor: '#e74c3c',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  notAvailableText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
});

export default HomeScreen; 