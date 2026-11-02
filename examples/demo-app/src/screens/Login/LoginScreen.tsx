import React from 'react';
import {useForm} from 'react-hook-form';
import {TextInputField, Button} from '../../components';
import Config from '../../services/config';
import {execute} from '../../services/client';

export default function LoginScreen({navigation}) {
  const {control, handleSubmit} = useForm();
  const onLogin = async values => {
    const res = await execute(Config.ACTION_CODE.LOGIN, values);
    if (res?.status?.code === 'OK') navigation.navigate('CLAIM_LIST_SCREEN');
  };
  return (
    <>
      <TextInputField control={control} name="username" label="Tên đăng nhập" required />
      <TextInputField control={control} name="password" label="Mật khẩu" secureTextEntry required />
      <Button title="Đăng nhập" onPress={handleSubmit(onLogin)} />
    </>
  );
}
