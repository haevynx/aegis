import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {Stepper} from '../../components';
import Config from '../../services/config';
import {execute} from '../../services/client';
import PhotoStep from './components/PhotoStep';

export default function ClaimInspectionScreen({route, navigation}) {
  const {claimId} = route.params;
  const [claim, setClaim] = useState(null);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    execute(Config.ACTION_CODE.CLAIM_DETAIL, {claim_id: claimId}).then(res => setClaim(res.data));
  }, [claimId]);

  const finish = async () => {
    if (photos.length < 4) return Alert.alert('Thông báo', 'Cần chụp tối thiểu 4 ảnh tổn thất');
    if (claim?.trang_thai === 'DA_KET_THUC') return Alert.alert('Thông báo', 'Hồ sơ đã kết thúc giám định');
    const res = await execute(Config.ACTION_CODE.CLAIM_FINISH, {claim_id: claimId});
    if (res?.status?.message === 'Bạn chưa đặt lịch giám định với khách hàng.') return navigation.navigate('SCHEDULE_SCREEN', {claimId});
    if (res?.status?.code === 'OK') navigation.goBack();
  };

  return (
    <Stepper steps={['Thông tin hồ sơ', 'Chụp ảnh', 'Kết thúc']}>
      <PhotoStep claimId={claimId} photos={photos} onChange={setPhotos} />
    </Stepper>
  );
}
