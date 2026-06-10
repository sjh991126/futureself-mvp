import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import HomeIcon from '../../assets/icons/home_icon';
import FocusedHomeIcon from '../../assets/icons/focused_home_icon';
import LibraryIcon from '../../assets/icons/library_icon';
import FocusedLibraryIcon from '../../assets/icons/focused_library_icon';
import CommunityIcon from '../../assets/icons/community_icon';
import FocusedCommunityIcon from '../../assets/icons/focused_community_icon';
import ProfileIcon from '../../assets/icons/profile_icon';
import FocusedProfileIcon from '../../assets/icons/focused_profile_icon';
import PlusIcon from '../../assets/icons/plus_icon';

const TabBar = React.memo(() => {
  const router = useRouter();
  const pathname = usePathname();

  const getTabStyle = (route) => {
    if (route === '/homepage' && (pathname === '/homepage' || pathname === '/all_search' || pathname === '/categories')) {
      return styles.tabTextFocused;
    }
    if (route === '/list' && (pathname === '/list')) {
      return styles.tabTextFocused;
    }
    if (route === '/community_home' && pathname === '/community_home') {
      return styles.tabTextFocused;
    }
    if (route === '/profile' && (pathname === '/profile' || pathname === '/profile')) {
      return styles.tabTextFocused;
    }
    return pathname === route ? styles.tabTextFocused : styles.tabText;
  };

  const isCurrentPage = (route) => pathname === route;

  // Navigation handler for main tabs - use replace to avoid stack buildup
  const handleMainTabNavigation = (route) => {
    if (isCurrentPage(route)) return;

    // Use replace to avoid stack buildup and ensure instant navigation
    router.replace(route);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => handleMainTabNavigation('/homepage')}
        disabled={isCurrentPage('/homepage')}
      >
        {pathname === '/homepage' || pathname === '/all_search' || pathname === '/categories' ? (
          <FocusedHomeIcon />
        ) : (
          <HomeIcon />
        )}
        <Text style={getTabStyle('/homepage')}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => handleMainTabNavigation('/list')}
        disabled={isCurrentPage('/list')}
      >
        {pathname === '/list' || pathname === '/list_details' ? (
          <FocusedLibraryIcon />
        ) : (
          <LibraryIcon />
        )}
        <Text style={getTabStyle('/list')}>My Trips</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, styles.addButtonWrapper]}
        onPress={() => handleMainTabNavigation('/modeselect')}
        disabled={isCurrentPage('/modeselect')}
      >
        <PlusIcon style={styles.addButtonIcon} />
        <Text style={getTabStyle('/modeselect')}></Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => handleMainTabNavigation('/community_home')}
        disabled={isCurrentPage('/community_home')}
      >
        {pathname === '/community_home' ? (
          <FocusedCommunityIcon width={24} height={24} color="white" />
        ) : (
          <CommunityIcon width={24} height={24} color="white" />
        )}
        <Text style={getTabStyle('/community_home')}>Community</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => handleMainTabNavigation('/profile')}
        disabled={isCurrentPage('/profile')}
      >
        {pathname === '/profile' || pathname === '/profile' ? (
          <FocusedProfileIcon width={24} height={24} color="white" />
        ) : (
          <ProfileIcon width={24} height={24} color="white" />
        )}
        <Text style={getTabStyle('/profile')}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    backgroundColor: 'black',
    borderTopWidth: 1,
    borderTopColor: '#333333'
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  tabTextFocused: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  addButtonWrapper: {
    flex: 0,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  addButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 30,
    top: -10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default TabBar;
