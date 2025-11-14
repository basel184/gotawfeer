<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
    <main class="container py-5">
      <div class="row">
        <div class="col-12">
          <article class="card p-4 mb-4">
            <h2 class="section-title">{{ t('intellectual_property.title') }}</h2>
            <hr>
            <p>
                {{ t('intellectual_property.content_1') }}
            </p>
            <p>
                {{ t('intellectual_property.content_2') }}
            </p>
            <p>
                {{ t('intellectual_property.content_3') }}
            </p>
          </article>
        </div>
      </div>
    </main>
</template>