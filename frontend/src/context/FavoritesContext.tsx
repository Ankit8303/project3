import React, { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";

export interface FavRestaurant {
  _id: string;
  name: string;
  image: string;
  isOpen?: boolean;
  description?: string;
}

export interface FavDish {
  _id: string;
  restaurantId: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
}

interface FavoritesContextType {
  favoriteRestaurants: FavRestaurant[];
  favoriteDishes: FavDish[];
  isRestaurantFav: (id: string) => boolean;
  toggleRestaurantFav: (restaurant: FavRestaurant) => void;
  isDishFav: (id: string) => boolean;
  toggleDishFav: (dish: FavDish) => void;
  favRestaurantsCount: number;
  favDishesCount: number;
  totalFavoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<FavRestaurant[]>(() => {
    try {
      const saved = localStorage.getItem("tomato_fav_restaurants");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favoriteDishes, setFavoriteDishes] = useState<FavDish[]>(() => {
    try {
      const saved = localStorage.getItem("tomato_fav_dishes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("tomato_fav_restaurants", JSON.stringify(favoriteRestaurants));
    } catch (e) {
      console.error("Failed to save favorite restaurants to localStorage", e);
    }
  }, [favoriteRestaurants]);

  useEffect(() => {
    try {
      localStorage.setItem("tomato_fav_dishes", JSON.stringify(favoriteDishes));
    } catch (e) {
      console.error("Failed to save favorite dishes to localStorage", e);
    }
  }, [favoriteDishes]);

  const isRestaurantFav = (id: string) => {
    return favoriteRestaurants.some((r) => r._id === id);
  };

  const toggleRestaurantFav = (restaurant: FavRestaurant) => {
    setFavoriteRestaurants((prev) => {
      const exists = prev.some((r) => r._id === restaurant._id);
      if (exists) {
        toast("Removed from Favorites", { icon: "💔" });
        return prev.filter((r) => r._id !== restaurant._id);
      } else {
        toast.success(`Saved "${restaurant.name}" to Favorites! ❤️`);
        return [...prev, restaurant];
      }
    });
  };

  const isDishFav = (id: string) => {
    return favoriteDishes.some((d) => d._id === id);
  };

  const toggleDishFav = (dish: FavDish) => {
    setFavoriteDishes((prev) => {
      const exists = prev.some((d) => d._id === dish._id);
      if (exists) {
        toast("Removed dish from Favorites", { icon: "💔" });
        return prev.filter((d) => d._id !== dish._id);
      } else {
        toast.success(`Saved "${dish.name}" to Favorites! ❤️`);
        return [...prev, dish];
      }
    });
  };

  const favRestaurantsCount = favoriteRestaurants.length;
  const favDishesCount = favoriteDishes.length;
  const totalFavoritesCount = favRestaurantsCount + favDishesCount;

  return (
    <FavoritesContext.Provider
      value={{
        favoriteRestaurants,
        favoriteDishes,
        isRestaurantFav,
        toggleRestaurantFav,
        isDishFav,
        toggleDishFav,
        favRestaurantsCount,
        favDishesCount,
        totalFavoritesCount,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
