import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import thunkMiddleware from 'redux-thunk';
import { Provider, useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { 
  Avatar,
  Breadcrumb,
  Card,
  Image,
  Layout,
  List,
  Skeleton,
 } from 'antd';
import { Content, Header } from 'antd/es/layout/layout';

const domNode = document.getElementById('root');
const root = createRoot(domNode);

const { Meta } = Card;

const initialState = {
  pokemons: [],
  loading: false,
  error: null,
};

const pokemonSlice = createSlice({
  name: 'pokemon',
  initialState,
  reducers: {
    fetchPokemonsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPokemonsSuccess(state, action) {
      state.loading = false;
      state.pokemons = action.payload;
    },
    fetchPokemonsFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

const { fetchPokemonsStart, fetchPokemonsSuccess, fetchPokemonsFailure } = pokemonSlice.actions;

const fetchPokemons = () => {
  return async (dispatch) => {
    dispatch(fetchPokemonsStart());

    try {
      const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=151');
      const pokemons = response.data.results;
      
      const pokemonData = await Promise.all(
        pokemons.map(async (pokemon) => {
          const pokemonResponse = await axios.get(pokemon.url);
          const speciesResponse = await axios.get(pokemonResponse.data.species.url);
          const description = speciesResponse.data.flavor_text_entries.find((entry) => entry.language.name === 'en').flavor_text.replace(/\f/g, ' ');

          return {
            id: pokemonResponse.data.id,
            name: pokemonResponse.data.name,
            imageUrl: pokemonResponse.data.sprites.other['official-artwork'].front_default,
            description,
          };
        })
      );

      dispatch(fetchPokemonsSuccess(pokemonData));
    } catch (error) {
      dispatch(fetchPokemonsFailure(error.message));
    }
  };
};

const store = configureStore({
  reducer: { pokemon: pokemonSlice.reducer },
  middleware: [thunkMiddleware],
});

const App = () => {
  const pokemons = useSelector((state) => state.pokemon.pokemons);
  const dispatch = useDispatch();
  const [imageSources, setImageSources] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchPokemons())
  }, [dispatch]);

  useEffect(() => {
    const promises = pokemons.map(pokemon =>
      axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon.name}`)
      .then(response => ({
        id: response.data.id,
        name: pokemon.name,
        src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${response.data.id}.png`
      }))
      .then(
        setTimeout(() => {
          setLoading(false)
        }, 200)
      )
    );

    Promise.all(promises)
      .then(images => {
        const sources = images.reduce((acc, image) => ({ ...acc, [image.name]: image.src }), {});
        setImageSources(sources);
      })
      .catch(error => console.error(error));
  }, [pokemons]);

  function Capitalize(str){
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return (
    <Layout>
      <Header style={{ backgroundColor: '#5679EA', display: 'flex' }}>
        <Avatar
          src="https://www.reidmosieur.com/assets/img/avataaars.svg"
          style={{ alignSelf: 'center', height: '50px', width: '50px' }}
          onClick={ () => window.open('https://reidmosieur.com', '_blank') }
        />
      </Header>
      <Content style={{ padding: '10px 10px 25px 10px' }}>
        <Breadcrumb items={[
          {title: "Home"},
          {title: "Pokemon"},
          {title: "Kanto Region"}
        ]} />
        <List
          loading={loading}
          style={{padding: '10px' }}
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 3, xxl: 8 }}
          dataSource={pokemons}
          renderItem={(pokemon) => (
            <List.Item>
              <Card
                style={{ background: '#eac756' }}
              >
                <Card
                  loading={loading}
                  style={{ background: '#f4e5a7' }}
                  cover={
                    loading ? (
                      <Skeleton.Image/>
                    ) : (
                      <Image
                        alignSelf={'center'}
                        src={imageSources[pokemon.name]}
                        alt={pokemon.name}
                      />
                    )
                  }
                >
                  <Meta
                    title={Capitalize(pokemon.name)}
                    description={pokemon.description}
                  />
                </Card>
              </Card>
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
};

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);