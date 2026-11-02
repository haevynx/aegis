import React from 'react';
import {Alert} from 'react-native';
import {CameraButton, PhotoGrid, Dropdown} from '../../../components';
import Config from '../../../services/config';
import {execute} from '../../../services/client';

export default function PhotoStep({claimId, photos, onChange}) {
  const upload = async (photo, hang_muc) => {
    if (!hang_muc) return Alert.alert('Thông báo', 'Vui lòng chọn hạng mục tổn thất');
    const res = await execute(Config.ACTION_CODE.PHOTO_UPLOAD, {claim_id: claimId, hang_muc, file: photo.base64});
    if (res?.status?.code === 'OK') onChange([...photos, photo]);
  };
  return (
    <>
      <Dropdown name="hang_muc" label="Hạng mục tổn thất" required />
      <CameraButton onCapture={upload} />
      <PhotoGrid photos={photos} />
    </>
  );
}
