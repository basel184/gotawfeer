<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
    <main class="container py-5">
<div class="row">
<div class="col-12">
<article class="card p-4 mb-4">
          <h2 class="section-title">{{ t('terms.title') }}</h2>
<hr>

<section class="mb-3">
            <h5 class="fw-bold">{{ t('terms.disclaimer.title') }}</h5>
            <p class="mb-0">{{ t('terms.disclaimer.content') }}</p>
</section>

<section class="mb-3">
            <h5 class="fw-bold">{{ t('terms.exchange_return.title') }}</h5>
<ul>
              <li v-html="t('terms.exchange_return.items.time_limit', { days: '7' })"></li>
              <li>{{ t('terms.exchange_return.items.packaging_difference') }}</li>
              <li v-html="t('terms.exchange_return.items.refund_time', { days: '15' })"></li>
              <li v-html="t('terms.exchange_return.items.damaged_product', { days: '3' })"></li>
              <li>{{ t('terms.exchange_return.items.devices') }}</li>
              <li>{{ t('terms.exchange_return.items.proof') }}</li>
              <li>{{ t('terms.exchange_return.items.processing') }}</li>
              <li>{{ t('terms.exchange_return.items.verify') }}</li>
              <li>{{ t('terms.exchange_return.items.no_defect') }}</li>
              <li>{{ t('terms.exchange_return.items.shipping_fees') }}</li>
</ul>
</section>

<section class="mb-3">
            <h5 class="fw-bold">{{ t('terms.faq.title') }}</h5>
            <p class="mb-0"><strong>{{ t('terms.faq.question') }}</strong></p>
            <p class="mb-0"><strong>{{ t('terms.faq.answer') }}</strong></p>
</section>

<section class="mb-3">
            <h5 class="fw-bold">{{ t('terms.cancellation.title') }}</h5>
            <p v-html="t('terms.cancellation.content_1', { hours: '24' })"></p>
            <p>{{ t('terms.cancellation.content_2') }}</p>
</section>

<section class="mb-3">
            <h5 class="fw-bold">{{ t('terms.bulk_orders.title') }}</h5>
            <p>{{ t('terms.bulk_orders.content') }}</p>
</section>
</article>

<article class="card p-4">
          <h5 class="section-title">{{ t('terms.important_notes.title') }}</h5>
          <p class="mb-0">{{ t('terms.important_notes.content') }}</p>
</article>
</div>
</div>
</main>
</template>