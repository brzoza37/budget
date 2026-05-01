import React from 'react';
import Layout from '../components/Layout';
import { Typography } from '@mui/material';

const Placeholder = ({ title }: { title: string }) => (
  <Layout title={title}>
    <Typography>This is a placeholder for {title} screen.</Typography>
  </Layout>
);

export default Placeholder;
