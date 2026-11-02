import React, {useEffect, useState} from 'react';
import {FlatList, Alert} from 'react-native';
import {ClaimCard, SearchBar} from '../../components';
import Config from '../../services/config';
import {execute} from '../../services/client';

export default function ClaimListScreen({navigation}) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('MOI');

  useEffect(() => {
    load();
  }, [status]);

  const load = async () => {
    const res = await execute(Config.ACTION_CODE.CLAIM_LIST, {trang_thai: status, trang: 1, so_dong: 20});
    if (res?.status?.code !== 'OK') return Alert.alert('Thông báo', res?.status?.message);
    setItems(res.data);
  };

  return (
    <>
      <SearchBar placeholder="Tìm theo biển số, số hồ sơ" />
      <FlatList
        data={items}
        renderItem={({item}) => (
          <ClaimCard
            title={item.so_ho_so}
            subtitle={item.bien_so_xe}
            onPress={() => navigation.navigate('CLAIM_INSPECTION_SCREEN', {claimId: item.claim_id})}
          />
        )}
      />
    </>
  );
}
